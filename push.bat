@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Update stream CTA button text from Daftar Barang to Ajukan Barang"
git push origin main
