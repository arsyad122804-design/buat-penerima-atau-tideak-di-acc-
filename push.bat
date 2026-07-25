@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Remove Batas Stok Minimum field and add live Rupiah formatting with thousand separators"
git push origin main
