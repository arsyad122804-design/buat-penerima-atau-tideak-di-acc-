@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix duplicate sendWaNotification inside renderSubmissionTable that was triggering window.open"
git push origin main
