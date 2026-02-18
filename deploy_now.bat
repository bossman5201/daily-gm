@echo off
setlocal enabledelayedexpansion
echo ========================================================
echo       DAILY GM - DEPLOYMENT SCRIPT
echo ========================================================
echo.

:: Try to find forge
where forge >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Forge not found in PATH.
    echo Please make sure you installed Foundry and restarted your terminal.
    echo.
    echo Attempting to use default location...
    set "PATH=%USERPROFILE%\.foundry\bin;%PATH%"
)

cd packages/contracts

echo 1. Running Tests...
call forge test
if %errorlevel% neq 0 (
    echo [WARNING] Tests failed! Check the output above.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Tests Passed! Deploying to Base Mainnet...
echo This will use the PRIVATE_KEY from your .env file.
echo.
call forge script script/Deploy.s.sol:Deploy --rpc-url https://mainnet.base.org --broadcast

echo.
echo ========================================================
echo.
echo If you see "Script ran successfully" above:
echo   COPY THE CONTRACT ADDRESS!
echo.
pause
