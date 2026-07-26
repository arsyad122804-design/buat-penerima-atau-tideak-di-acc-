@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Enable direct Google Gemini 1.5 Flash API execution for real LLM responses"
git push origin main
