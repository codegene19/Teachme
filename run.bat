@echo off
rem Lexicosmos: install what it needs and run it (Windows).
cd /d "%~dp0"
where py >nul 2>nul && (py -3 run.py %* & goto :eof)
where python >nul 2>nul && (python run.py %* & goto :eof)
echo Python 3.8+ is needed: https://www.python.org/downloads/
pause
