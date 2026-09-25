@echo off
REM Starts the FastAPI backend with auto-reload, the standard way to run a
REM uvicorn service in development. Run from anywhere; this script switches
REM into server/ itself so relative paths (venv, .env) resolve correctly.
cd /d "%~dp0"
venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 5001 --reload
