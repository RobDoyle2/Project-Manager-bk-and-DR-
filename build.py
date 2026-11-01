#!/usr/bin/env python3
"""Assemble the standalone application (src/ -> Backup-DR-Project.html). Run: python3 build.py"""
import pathlib
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
js = '\n'.join((src / n).read_text() for n in sorted(p.name for p in src.glob('0*.js')))
html = (src / 'shell.html').read_text()
html = html.replace('/*__CSS__*/', (src / 'style.css').read_text())
html = html.replace('/*__REPORT_CSS__*/', (src / 'report.css').read_text())
html = html.replace('/*__JS__*/', js.replace('</script>', '<\\/script>'))
(root / 'Backup-DR-Project.html').write_text(html)
print('built Backup-DR-Project.html', len(html) // 1024, 'KB')
