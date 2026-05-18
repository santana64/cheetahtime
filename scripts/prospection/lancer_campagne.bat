@echo off
cd /d C:\dev\cheetahproject-codex-build-cheetah-time\cheetahproject-codex-build-cheetah-time\scripts\prospection

echo ==============================
echo  Campagne prospection ChantierDevis
echo  %date% %time%
echo ==============================

echo.
echo [1/4] Sync stats Brevo...
python sync_brevo_stats.py
echo.

echo [2/4] Envoi emails J0 (nouveaux prospects)...
python envoi_email.py
echo.

echo [3/4] Relances J4...
python relance_j4.py
echo.

echo [4/4] Relances J10...
python relance_j10.py
echo.

echo ==============================
echo  Campagne terminee !
echo ==============================
pause
