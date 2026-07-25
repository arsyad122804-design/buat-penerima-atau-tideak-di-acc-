@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix global scope for currentApprovalId and currentApprovalAction to make Konfirmasi button work 100%"
git push origin main
