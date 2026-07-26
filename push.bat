@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Lock +62 country code badge permanently in WA input fields so it cannot be backspaced"
git push origin main
