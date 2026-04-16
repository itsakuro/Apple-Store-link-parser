const inputURL = document.getElementById('inputURL');
const parseButton = document.getElementById('parseButton');
const output = document.getElementById('output');

function AppleStoreOnlineGetProductType(typeSlug) {
    if (!typeSlug) return "ERR_UNKNOWN";

    const typeMap = {
        "buy-iphone": "iphone",
        "buy-mac": "mac",
        "buy-ipad": "ipad",
        "buy-watch": "watch"
    };

    return typeMap[typeSlug] || "ERR_UNKNOWN";
}

function AppleStoreOnlineParseURL(url) {
    const urlObject = new URL(url);
    const pieces = urlObject.pathname.split('/').filter(Boolean);

    const typeSlug = pieces.find(p => p.startsWith('buy-'));
    const modelSlug = pieces[2];
    const specSlug = pieces[pieces.length - 1];

    const type = AppleStoreOnlineGetProductType(typeSlug);

    const base = AppleStoreOnlineParseCommon(specSlug);
    const model = AppleStoreOnlineFormatModel(modelSlug, base.size);

    return {
        type,
        model,
        ...base
    };
}

function AppleStoreOnlineParseCommon(specSlug) {
    // MATCHES
    const sizeMatch = specSlug.match(/(\d+(\.\d+)?)\-inch\-display/);
    const storageMatch = specSlug.match(/(\d+)(gb|tb)/i);
    const unifiedMemoryMatch = specSlug.match(/(\d+)(gb)-memory/i);
    const chipMatch = specSlug.match(/apple-([a-z0-9\-]+)-chip/i);
    const cpuMatch = specSlug.match(/(\d+)-core-cpu/i);
    const gpuMatch = specSlug.match(/(\d+)-core-gpu/i);
    // const displayTypeMatch = ( standard-display / nano-texture-glass )

    const carrierPatterns = ["unlocked", "att", "verizon", "boost-mobile", "t-mobile"];
    const carrierMap = {
        "unlocked": "Unlocked",
        "att": "AT&T",
        "verizon": "Verizon",
        "boost-mobile": "Boost Mobile",
        "t-mobile": "T-Mobile"
    };

    let carrierSlug = carrierPatterns.find(c => specSlug.includes(c));

    let cleanedUp = specSlug
        .replace(/(\d+(\.\d+)?)\-inch\-display/, '')
        .replace(/(\d+)(gb|tb)/i, '')
        .replace(/(\d+)(gb)-memory/i, '')
        .replace(/apple-([a-z0-9\-]+)-chip/i, '')
        .replace(/(\d+)-core-cpu/i, '')
        .replace(/(\d+)-core-gpu/i, '')
        .replace(carrierSlug || '', '')
        .replace(/^-+|-+$/g, '');
    
    return {
        // shared
        size: sizeMatch ? `${sizeMatch[1]} inches` : "ERR_UNKNOWN",
        storage: storageMatch ? `${storageMatch[1]}${storageMatch[2].toUpperCase()}` : "ERR_UNKNOWN",
        carrier: carrierSlug ? carrierMap[carrierSlug] : "ERR_UNKNOWN",

        // Mac
        unifiedMemory: unifiedMemoryMatch ? `${unifiedMemoryMatch[1]}${unifiedMemoryMatch[2].toUpperCase()}` : "ERR_UNKNOWN",
        chip: chipMatch ? chipMatch[1]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase()) : "ERR_UNKNOWN",
        cpu: cpuMatch ? `${cpuMatch[1]} cores` : "ERR_UNKNOWN",
        gpu: gpuMatch ? `${gpuMatch[1]} cores` : "ERR_UNKNOWN",
        

        // finish
        finish: cleanedUp
            .split('-')
            .filter(Boolean)
            .join(' ')
            .replace(/\b\w/g, c => c.toUpperCase())
    };
}

function AppleStoreOnlineFormatModel(modelSlug, size) {
    let model = modelSlug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    model = model
        .replace("Iphone", "iPhone")
        .replace("Macbook", "MacBook")
        .replace("Imac", "iMac");
    
    // iPhone Pro Max
    if (model.includes("Iphone")) {
        if (model.includes("Pro") && !model.includes("Max")) {
            if (size.includes("6.9")) {
                model = model.replace("Pro", "Pro Max");
            }
        }
    }

    return model;
}

function AppleStoreOnlineFormatData(data) {
    switch (data.type) {
        case "iphone":
            return {
                title: data.model,
                fields: [
                    { label: "Size", value: data.size },
                    { label: "Storage", value: data.storage },
                    { label: "Finish", value: data.finish },
                    { label: "Carrier", value: data.carrier }
                ].filter(f => f.value && f.value !== "ERR_UNKNOWN")
            };
        case "mac":
            return {
                title: data.model,
                subtitle: data.chip !== "ERR_UNKNOWN" ? `with ${data.chip} chip` : null,
                fields: [
                    { label: "Size", value: data.size },
                    { label: "Storage", value: data.storage },
                    { label: "Finish", value: data.finish },
                    { label: "Memory", value: data.unifiedMemory },
                    { label: "CPU", value: data.cpu },
                    { label: "GPU", value: data.gpu }
                ].filter(f => f.value && f.value !== "ERR_UNKNOWN")
            };
        case "ipad":
            return {
                title: data.model,
                fields: [
                    { label: "Size", value: data.size },
                    { label: "Storage", value: data.storage },
                    { label: "Finish", value: data.finish }
                ].filter(f => f.value && f.value !== "ERR_UNKNOWN")
            };
        case "watch":
            return {
                title: data.model,
                fields: [
                    { label: "Size", value: data.size },
                    { label: "Storage", value: data.storage },
                    { label: "Finish", value: data.finish },
                ].filter(f => f.value && f.value !== "ERR_UNKNOWN")
            };
        default:
    }
}

function AppleStoreOnlineRenderDynamicEmbed(data) {
    const card = AppleStoreOnlineFormatData(data);

    return `
        <h1>${card.title}</h1>
        <h2>${card.subtitle ?? ''}</h2>
        <ul>
            ${card.fields.map(f => `<li><b>${f.label}:</b> ${f.value}</li>`).join('')}
        </ul>
        
        <a href="${inputURL.value}" target="_blank"><button>View on apple.com</button></a>
    `;
}

parseButton.addEventListener('click', () => {
    const url = inputURL.value;

    const parsed = AppleStoreOnlineParseURL(url);
    const html = AppleStoreOnlineRenderDynamicEmbed(parsed);

    output.innerHTML = html;
})

/*

BUY iPHONE

iPhone 17
https://www.apple.com/shop/buy-iphone/iphone-17/6.3-inch-display-512gb-lavender-boost-mobile

iPhone 17 Pro Max
https://www.apple.com/shop/buy-iphone/iphone-17-pro/6.9-inch-display-1tb-cosmic-orange-unlocked

iPhone 16
https://www.apple.com/shop/buy-iphone/iphone-16/6.7-inch-display-256gb-ultramarine-att

-------

BUY MAC

MacBook Pro
https://www.apple.com/shop/buy-mac/macbook-pro/14-inch-silver-standard-display-apple-m5-max-chip-18-core-cpu-40-core-gpu-128gb-memory-2tb-storage

-------

BUY WATCH

Apple Watch Series 11
https://www.apple.com/shop/buy-watch/apple-watch/46mm-cellular-jet-black-aluminum-neon-yellow-braided-solo-loop-size-6

*/