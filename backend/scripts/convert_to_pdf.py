#!/usr/bin/env python3
"""
Convert a .docx file to PDF using LibreOffice (headless).

Usage:  python3 convert_to_pdf.py <input.docx> <output_dir>

Writes <output_dir>/<input name>.pdf and prints its path on success.
Exit codes: 0 = ok, 1 = bad usage / missing file, 2 = LibreOffice failed.
Standard library only, so no pip install is needed.
"""
import os
import shutil
import subprocess
import sys
import tempfile


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: convert_to_pdf.py <input.docx> <output_dir>", file=sys.stderr)
        return 1

    docx_path = os.path.abspath(sys.argv[1])
    out_dir = os.path.abspath(sys.argv[2])

    if not os.path.isfile(docx_path):
        print(f"Input file not found: {docx_path}", file=sys.stderr)
        return 1
    os.makedirs(out_dir, exist_ok=True)

    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        print("LibreOffice (soffice) is not installed.", file=sys.stderr)
        return 2

    # A throwaway profile per run avoids lock/permission problems and lets
    # several conversions run without clashing.
    with tempfile.TemporaryDirectory(prefix="lo-profile-") as profile:
        env = dict(os.environ, HOME=profile)
        cmd = [
            soffice,
            f"-env:UserInstallation=file://{profile}",
            "--headless",
            "--norestore",
            "--nolockcheck",
            "--convert-to", "pdf",
            "--outdir", out_dir,
            docx_path,
        ]
        try:
            result = subprocess.run(
                cmd, env=env, capture_output=True, text=True, timeout=80
            )
        except subprocess.TimeoutExpired:
            print("LibreOffice timed out.", file=sys.stderr)
            return 2

    pdf_path = os.path.join(
        out_dir, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf"
    )
    if result.returncode != 0 or not os.path.isfile(pdf_path):
        print(f"Conversion failed: {result.stderr or result.stdout}", file=sys.stderr)
        return 2

    print(pdf_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())