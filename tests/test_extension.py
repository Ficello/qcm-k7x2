import json
import re
import shutil
import struct
import subprocess
from pathlib import Path

EXT_ROOT = Path(__file__).resolve().parent.parent


def test_manifest_is_valid_mv3_and_all_files_exist():
    manifest_path = EXT_ROOT / "manifest.json"
    assert manifest_path.is_file()
    data = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert data["manifest_version"] == 3
    assert data["name"] == "QCM Clavier"
    assert "storage" in data["permissions"]
    assert "activeTab" in data["permissions"]

    gecko = data.get("browser_specific_settings", {}).get("gecko", {})
    assert gecko.get("id") == "qcm-clavier@local.edn"
    assert gecko.get("strict_min_version") == "109.0"

    # Check icons
    for size, rel in data["icons"].items():
        assert (EXT_ROOT / rel).is_file(), f"Missing icon {size}: {rel}"

    # Check action popup & icons
    assert (EXT_ROOT / data["action"]["default_popup"]).is_file()
    for size, rel in data["action"]["default_icon"].items():
        assert (EXT_ROOT / rel).is_file(), f"Missing action icon {size}: {rel}"

    # Check options page
    assert (EXT_ROOT / data["options_ui"]["page"]).is_file()

    # Check content scripts
    assert len(data["content_scripts"]) == 5
    for cs in data["content_scripts"]:
        for js_rel in cs["js"]:
            assert (EXT_ROOT / js_rel).is_file(), f"Missing content script: {js_rel}"


def test_png_icons_have_valid_headers_and_dimensions():
    expected = {
        "icon16.png": (16, 16),
        "icon32.png": (32, 32),
        "icon48.png": (48, 48),
        "icon128.png": (128, 128),
    }
    for fname, (exp_w, exp_h) in expected.items():
        raw = (EXT_ROOT / "icons" / fname).read_bytes()
        assert raw[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG header in {fname}"
        assert raw[12:16] == b"IHDR", f"Missing IHDR chunk in {fname}"
        w, h = struct.unpack(">II", raw[16:24])
        assert (w, h) == (exp_w, exp_h), f"Unexpected dimensions in {fname}: {(w, h)}"


def _strip_js_strings_and_comments(src: str) -> str:
    out = []
    i = 0
    n = len(src)
    prev_sig = ""
    prev_word = ""
    regex_keywords = {"return", "case", "throw", "typeof", "void", "delete", "in", "of", "else"}
    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if ch == "/" and nxt == "/":
            while i < n and src[i] != "\n":
                i += 1
        elif ch == "/" and nxt == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                i += 1
            i += 2
        elif ch == "/" and (
            prev_sig in ("", "(", "[", "{", ",", ";", "=", ":", "!", "&", "|", "?", "~", "+", "-", "*", "%", "<", ">", "\n")
            or prev_word in regex_keywords
        ):
            # Skip regex literal /.../flags
            i += 1
            in_class = False
            while i < n:
                if src[i] == "\\":
                    i += 2
                elif src[i] == "[":
                    in_class = True
                    i += 1
                elif src[i] == "]" and in_class:
                    in_class = False
                    i += 1
                elif src[i] == "/" and not in_class:
                    i += 1
                    break
                elif src[i] == "\n":
                    break
                else:
                    i += 1
            prev_sig = "/"
            prev_word = ""
        elif ch in ("'", '"', "`"):
            quote = ch
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                elif src[i] == quote:
                    i += 1
                    break
                else:
                    i += 1
            prev_sig = quote
            prev_word = ""
        elif ch.isalpha() or ch == "_" or ch == "$":
            start = i
            while i < n and (src[i].isalnum() or src[i] in ("_", "$")):
                i += 1
            word = src[start:i]
            out.append(word)
            prev_sig = "W"
            prev_word = word
        else:
            out.append(ch)
            if not ch.isspace():
                prev_sig = ch
                prev_word = ""
            elif ch == "\n" and prev_sig not in (")", "]", "}", "W"):
                prev_sig = "\n"
            i += 1
    return "".join(out)


def test_js_files_have_balanced_delimiters():
    js_files = list(EXT_ROOT.rglob("*.js"))
    assert len(js_files) >= 12
    pairs = {"(": ")", "[": "]", "{": "}"}
    closing = set(pairs.values())
    for js_file in js_files:
        text = js_file.read_text(encoding="utf-8")
        cleaned = _strip_js_strings_and_comments(text)
        stack = []
        for ch in cleaned:
            if ch in pairs:
                stack.append(pairs[ch])
            elif ch in closing:
                assert stack and stack[-1] == ch, f"Unbalanced delimiter '{ch}' in {js_file}"
                stack.pop()
        assert not stack, f"Unclosed delimiters {stack} in {js_file}"


def test_all_js_files_parse_cleanly_in_v8():
    chrome_candidates = [
        shutil.which("chrome"),
        shutil.which("chrome.exe"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    chrome_bin = next((c for c in chrome_candidates if c and Path(c).is_file()), None)
    assert chrome_bin is not None, "Chrome executable not found"

    js_files = sorted(EXT_ROOT.rglob("*.js"))
    sources = {str(p.relative_to(EXT_ROOT)): p.read_text(encoding="utf-8") for p in js_files}
    payload = json.dumps(sources)
    html = f"""<!doctype html><html><head><title>PENDING</title></head><body><pre id="out"></pre><script>
      const sources = {payload};
      const errs = [];
      for (const [name, code] of Object.entries(sources)) {{
        try {{ new Function(code); }} catch (e) {{ errs.push(name + ': ' + e.message); }}
      }}
      document.getElementById('out').textContent = errs.join('\\n');
      document.title = errs.length === 0 ? 'SYNTAX_OK' : 'SYNTAX_ERR';
    </script></body></html>"""

    tmp_html = EXT_ROOT / "tests" / "_syntax_check.html"
    try:
        tmp_html.write_text(html, encoding="utf-8")
        proc = subprocess.run(
            [chrome_bin, "--headless=new", "--disable-gpu", "--dump-dom", tmp_html.resolve().as_uri()],
            capture_output=True,
            text=True,
            timeout=30,
            encoding="utf-8",
            errors="replace",
        )
        assert proc.returncode == 0
        assert "<title>SYNTAX_OK</title>" in proc.stdout, f"V8 syntax errors:\n{proc.stdout}"
    finally:
        if tmp_html.exists():
            tmp_html.unlink()


def test_ui_and_docs_comply_with_kill_ai_slop():
    targets = list((EXT_ROOT / "ui").glob("*")) + [EXT_ROOT / "README.md"]
    emoji_re = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]")
    for path in targets:
        txt = path.read_text(encoding="utf-8")
        lower = txt.lower()
        assert "linear-gradient" not in lower, f"Gradient found in {path}"
        assert "radial-gradient" not in lower, f"Radial gradient found in {path}"
        assert "background-clip: text" not in lower, f"Gradient-clip found in {path}"
        assert "backdrop-filter" not in lower, f"Glassmorphism found in {path}"
        assert "space grotesk" not in lower, f"Space Grotesk found in {path}"
        assert not emoji_re.search(txt), f"Emoji found in {path}"


def test_core_js_passes_in_headless_chrome_v8():
    chrome_candidates = [
        shutil.which("chrome"),
        shutil.which("chrome.exe"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    chrome_bin = next((c for c in chrome_candidates if c and Path(c).is_file()), None)
    assert chrome_bin is not None, "Chrome executable not found for V8 JS test execution"

    runner_url = (EXT_ROOT / "tests" / "test_runner.html").resolve().as_uri()
    proc = subprocess.run(
        [chrome_bin, "--headless=new", "--disable-gpu", "--dump-dom", runner_url],
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        errors="replace",
    )
    assert proc.returncode == 0, f"Chrome headless failed: {proc.stderr}"
    dom_out = proc.stdout
    assert "<title>PASS</title>" in dom_out, f"JS tests did not pass:\n{dom_out}"
    assert "0 failed" in dom_out, f"Unexpected test summary:\n{dom_out}"


def test_dist_packages_and_userscript_build_cleanly():
    import zipfile

    build_script = EXT_ROOT / "scripts" / "build_packages.py"
    assert build_script.is_file()
    proc = subprocess.run(
        ["python", str(build_script)],
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
    )
    assert proc.returncode == 0, f"build_packages.py failed: {proc.stderr}"

    dist_dir = EXT_ROOT / "dist"
    expected_files = [
        "QCM-Clavier-Chromium.zip",
        "QCM-Clavier-Firefox.xpi",
        "QCM-Clavier-Safari-Source.zip",
        "qcm-clavier.user.js",
        "GUIDE_INSTALLATION_AMIS.md",
    ]
    for name in expected_files:
        assert (dist_dir / name).is_file(), f"Missing dist artifact: {name}"

    with zipfile.ZipFile(dist_dir / "QCM-Clavier-Chromium.zip") as zf:
        names = set(zf.namelist())
        assert "manifest.json" in names
        assert not any(n.startswith("tests/") for n in names)
        c_manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        assert "browser_specific_settings" not in c_manifest

    with zipfile.ZipFile(dist_dir / "QCM-Clavier-Firefox.xpi") as zf:
        f_manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        assert f_manifest["browser_specific_settings"]["gecko"]["id"] == "qcm-clavier@local.edn"

    with zipfile.ZipFile(dist_dir / "QCM-Clavier-Safari-Source.zip") as zf:
        s_names = set(zf.namelist())
        assert "manifest.json" in s_names
        assert "scripts/build_safari_mac.sh" in s_names

    us_text = (dist_dir / "qcm-clavier.user.js").read_text(encoding="utf-8")
    assert "==UserScript==" in us_text
    for host in ("edn.fr", "hypocampus.fr", "uness.fr", "asclepia.io", "refoua.fr"):
        assert host in us_text, f"Missing @match host in userscript: {host}"

    guide_text = (dist_dir / "GUIDE_INSTALLATION_AMIS.md").read_text(encoding="utf-8")
    emoji_re = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]")
    assert not emoji_re.search(guide_text), "Emoji found in friend installation guide"

    # Verify unlisted install site & GitHub Pages docs artifacts
    for target_name in ("site", "docs"):
        target_dir = EXT_ROOT / target_name
        assert (target_dir / "index.html").is_file()
        assert (target_dir / "robots.txt").is_file()
        assert "Disallow: /" in (target_dir / "robots.txt").read_text(encoding="utf-8")
        for fname in (
            "qcm-clavier.user.js",
            "QCM-Clavier-Chromium.zip",
            "QCM-Clavier-Firefox.xpi",
            "QCM-Clavier-Safari-Source.zip",
        ):
            assert (target_dir / "files" / fname).is_file(), f"Missing {target_name} file: {fname}"
    assert (EXT_ROOT / "docs" / ".nojekyll").is_file()
    site_html = (EXT_ROOT / "site" / "index.html").read_text(encoding="utf-8")
    assert "noindex, nofollow" in site_html
    assert "linear-gradient" not in site_html.lower()
    assert "backdrop-filter" not in site_html.lower()
    assert not emoji_re.search(site_html), "Emoji found in site/index.html"

    # Verify bundled userscript parses cleanly in V8
    chrome_candidates = [
        shutil.which("chrome"),
        shutil.which("chrome.exe"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    chrome_bin = next((c for c in chrome_candidates if c and Path(c).is_file()), None)
    assert chrome_bin is not None
    payload = json.dumps(us_text)
    html = f"""<!doctype html><html><head><title>PENDING</title></head><body><pre id="err"></pre><script>
      try {{ new Function({payload}); document.title = 'US_OK'; }}
      catch (e) {{ document.getElementById('err').textContent = e.message; document.title = 'US_ERR'; }}
    </script></body></html>"""
    tmp_html = EXT_ROOT / "tests" / "_us_syntax.html"
    try:
        tmp_html.write_text(html, encoding="utf-8")
        res = subprocess.run(
            [chrome_bin, "--headless=new", "--disable-gpu", "--dump-dom", tmp_html.resolve().as_uri()],
            capture_output=True,
            text=True,
            timeout=30,
            encoding="utf-8",
            errors="replace",
        )
        assert res.returncode == 0
        assert "<title>US_OK</title>" in res.stdout, f"Userscript syntax error:\n{res.stdout}"
    finally:
        if tmp_html.exists():
            tmp_html.unlink()

    # Verify docs/index.html renders non-empty tutorial panel in headless Chrome
    docs_url = (EXT_ROOT / "docs" / "index.html").resolve().as_uri()
    docs_res = subprocess.run(
        [chrome_bin, "--headless=new", "--disable-gpu", "--dump-dom", docs_url],
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        errors="replace",
    )
    assert docs_res.returncode == 0, f"Chrome headless failed on docs/index.html: {docs_res.stderr}"
    docs_dom = docs_res.stdout
    assert 'id="panel"></section>' not in docs_dom, "Tutorial panel rendered empty in docs/index.html"
    assert "<h2>" in docs_dom and "<ol><li>" in docs_dom and 'class="btn"' in docs_dom, (
        f"Tutorial panel missing expected elements in docs/index.html:\n{docs_dom}"
    )
