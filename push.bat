@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git remote remove origin 2>nul
git remote add origin https://github.com/arsyad122804-design/buat-penerima-atau-tideak-di-acc-.git
git branch -M main
git add .
git commit -m "first commit"
git push -u origin main --force
