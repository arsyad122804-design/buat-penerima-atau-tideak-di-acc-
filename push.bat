@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix active canvas DOM reference after initSignaturePad to ensure automatic signature drawing"
git push origin main
