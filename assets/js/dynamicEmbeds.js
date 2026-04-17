const inputURL = document.getElementById('inputURL');
const parseButton = document.getElementById('parseButton');
const output = document.getElementById('output');

// Apple Store Online

const STORAGE_REGEX = /(\d+)(gb|tb)(?!-memory|-core)(?:-storage)?/i;
const UNIFIEDMEMORY_REGEX = /(\d+)gb-memory/i;

function AppleStoreOnline_getProductType(typeSlug) {
    if (!typeSlug) return 'ERR_UNKNOWN';

    const typeMap = {
        'buy-iphone': 'iphone',
        'buy-mac': 'mac',
        'buy-ipad': 'ipad',
        'buy-watch': 'watch'
    };

    return typeMap[typeSlug] || 'ERR_UNKNOWN';
}

function AppleStoreOnline_parseURL(url) {
    const urlObject = new URL(url);
    const pieces = urlObject.pathname.split('/').filter(Boolean);

    const typeSlug = pieces.find(p => p.startsWith('buy-'));
    const modelSlug = pieces[2];
    const specSlug = pieces[3] || '';

    const type = AppleStoreOnline_getProductType(typeSlug);

    const context = {
        type,
        modelSlug,
        specSlug,
        tokens: specSlug.split('-').filter(Boolean)
    };

    const parsers = {
        iphone: AppleStoreOnline_parseiPhone,
        mac: AppleStoreOnline_parseMac,
        ipad: AppleStoreOnline_parseiPad,
        // watch: AppleStoreOnline_parseWatch
    };

    const parser = parsers[type];
    if (!parser) {
        return { type: 'ERR_UNKNOWN', model: 'ERR_UNKNOWN' };
    }

    return parser(context);
}

function AppleStoreOnline_parseiPhone({ type, modelSlug, specSlug }) {
    const size = AppleStoreOnline_extractMatch(specSlug, /(\d+(?:\.\d+)?)\-inch(?:-display)?/, m => `${m[1]} inches`);
    const storage = AppleStoreOnline_extractMatch(specSlug, /(\d+)(gb|tb)(?!-memory|-core)/i, m => `${m[1]}${m[2].toUpperCase()}`);

    const carrierMap = {
        'unlocked': 'Unlocked',
        'att': 'AT&T',
        'verizon': 'Verizon',
        'boost-mobile': 'Boost Mobile',
        't-mobile': 'T-Mobile'
    };

    let carrierSlug = Object.keys(carrierMap).find(c => specSlug.includes(c));
    const carrier = carrierSlug ? carrierMap[carrierSlug] : null;

    let model = AppleStoreOnline_formatModel(modelSlug);

    if (model.includes('Pro') && size === '6.9 inches') {
        model = model.replace('Pro', 'Pro Max');
    }

    const finish = specSlug
        .replace(/(\d+(?:\.\d+)?)\-inch(?:-display)?/, '')
        .replace(/(\d+)(gb|tb)(?!-memory|-core)/i, '')
        .replace(new RegExp(Object.keys(carrierMap).join('|')), '')
        .replace(/^-+|-+$/g, '')
        .split('-')
        .filter(Boolean)
        .join(' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    
    return {
        type,
        model,
        size,
        storage,
        carrier,
        finish
    }
}

function AppleStoreOnline_parseMac({ type, modelSlug, specSlug }) {
    let model = AppleStoreOnline_formatModel(modelSlug);

    const sizeMatch = AppleStoreOnline_extractMatch(specSlug, /(\d+(?:\.\d+)?)\-inch(?:-display)?/, m => `${m[1]} inches`);
    const size = sizeMatch ?? model === 'MacBook Neo' ? '13 inches' : null

    const storage = AppleStoreOnline_extractMatch(specSlug, STORAGE_REGEX, m => `${m[1]}${m[2].toUpperCase()}`);
    const unifiedMemory = AppleStoreOnline_extractMatch(specSlug, UNIFIEDMEMORY_REGEX, m => `${m[1]}GB`);
    const cpu = AppleStoreOnline_extractMatch(specSlug, /(\d+)-core-cpu/i, m => `${m[1]}-core CPU`);
    const gpu = AppleStoreOnline_extractMatch(specSlug, /(\d+)-core-gpu/i, m => `${m[1]}-core GPU`);

    const display = AppleStoreOnline_extractMatch(
        specSlug,
        /(standard-display|nano-texture-glass)/i,
        m => {
            if (m[1] === 'standard-display') return 'Standard';
            if (m[1] === 'nano-texture-glass') return 'Nano-texture';
            return null;
        }
    )

    const chip = AppleStoreOnline_extractMatch(
        specSlug,
        /(?:apple-)?(m\d+(?:-[a-z0-9]+)*)-chip/i,
        m => titleCase(m[1].replace(/-/g, ' '))
    );

    const base = AppleStoreOnline_extractMatch(
        specSlug,
        /(vesa-mount-adapter|tilt-and-height-adjustable-stand|stand)\b/i,
        m => {
            switch(m[1]) {
                case 'vesa-mount-adapter':
                    return 'VESA Mount Adapter';
                case 'tilt-and-height-adjustable-stand':
                    return 'Tilt- and height-adjustable stand'
                case 'stand':
                    return 'Stand';
                default:
                    return null;
            }
        }
    )
    
    let topRightKey = null;
    if (model === 'MacBook Neo') {
        if (storage === '256GB') topRightKey = 'Lock Key';
        if (storage === '512GB') topRightKey = 'Touch ID';
    }

    const finish = specSlug
        .replace(/(\d+(?:\.\d+)?)\-inch(?:-display)?/, '')
        .replace(/(\d+)(gb|tb)(?!-memory|-core)(?:-storage)?/i, '')
        .replace(/(\d+)gb-memory/i, '')
        .replace(/(?:apple-)?(m\d+(?:-[a-z0-9]+)*)-chip/i, '')
        .replace(/(\d+)-core-cpu/i, '')
        .replace(/(\d+)-core-gpu/i, '')
        .replace(/standard-display/, '')
        .replace(/nano-texture-glass/, '')
        .replace(/tilt-and-height-adjustable-stand/, '')
        .replace(/vesa-mount-adapter/, '')
        .replace(/\bstand\b/, '')
        .replace(/^-+|-+$/g, '')
        .split('-')
        .filter(Boolean)
        .join(' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    
    return {
        type,
        model,
        size,
        display,
        storage,
        unifiedMemory,
        chip,
        cpu,
        gpu,
        base,
        topRightKey,
        finish
    }
}

function AppleStoreOnline_parseiPad({ type, modelSlug, specSlug }) {
    const size = AppleStoreOnline_extractMatch(specSlug, /(\d+(?:\.\d+)?)\-inch(?:-display)?/, m => `${m[1]} inches`);
    const storage = AppleStoreOnline_extractMatch(specSlug, STORAGE_REGEX, m => `${m[1]}${m[2].toUpperCase()}`);

    const connectivity = AppleStoreOnline_extractMatch(
        specSlug,
        /\b(wifi-cellular|wifi)\b/i,
        m => {
            if (m[1] === 'wifi-cellular') return 'Cellular';
            if (m[1] === 'wifi') return 'Wi-Fi';
            return null;
        }
    )
    
    let model = AppleStoreOnline_formatModel(modelSlug);

    const display = AppleStoreOnline_extractMatch(
        specSlug,
        /(standard-glass|nano-texture-glass)/i,
        m => {
            if (m[1] === 'standard-glass') return 'Standard';
            if (m[1] === 'nano-texture-glass') return 'Nano-texture';
            return null;
        }
    )

    const finish = specSlug
        .replace(/(\d+(?:\.\d+)?)\-inch(?:-display)?/, '')
        .replace(STORAGE_REGEX, '')
        .replace(/\bwifi-cellular\b/i, '')
        .replace(/\bwifi\b/i, '')
        .replace(/standard-glass/, '')
        .replace(/nano-texture-glass/, '')
        .replace(/^-+|-+$/g, '')
        .split('-')
        .filter(Boolean)
        .join(' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    
    return {
        type,
        model,
        size,
        storage,
        finish,
        connectivity,
        display
    }
}

function AppleStoreOnline_formatMacBase(base) {
    switch (base) {
        case 'Tilt- and height-adjustable stand':
            return 'Tilt + Height';
        case 'VESA Mount Adapter':
            return 'VESA';
        default:
            return base;
    }
}

function AppleStoreOnline_formatData(data) {
    switch (data.type) {
        case 'iphone':
            return {
                title: data.model,
                subtitle: null,
                subtitle2: null,
                fields: [
                    { label: 'Size', value: data.size },
                    { label: 'Storage', value: data.storage },
                    { label: 'Finish', value: data.finish },
                    { label: 'Carrier', value: data.carrier }
                ].filter(f => f.value)
            };
        case 'mac':
            const subtitle = data.chip ? `${data.chip} chip` : null;

            let subtitle2 = null;
            if (data.cpu && data.gpu) {
                subtitle2 = `${data.cpu}, ${data.gpu}`;
            } else if (data.cpu) {
                subtitle2 = data.cpu
            } else if (data.gpu) {
                subtitle2 = data.gpu
            }

            return {
                title: data.model,
                subtitle,
                subtitle2,
                fields: [
                    { label: 'Size', value: data.size },
                    { label: 'Display', value: data.display },
                    { label: 'Storage', value: data.storage },
                    { label: 'Finish', value: data.finish },
                    { label: 'Memory', value: data.unifiedMemory },
                    { label: 'Base', value: AppleStoreOnline_formatMacBase(data.base) },
                    { label: 'Keyboard', value: data.topRightKey }
                ].filter(f => f.value)
            };
        case 'ipad':
            return {
                title: data.model,
                subtitle: null,
                subtitle2: null,
                fields: [
                    { label: 'Size', value: data.size },
                    { label: 'Display', value: data.display },
                    { label: 'Storage', value: data.storage },
                    { label: 'Finish', value: data.finish },
                    { label: 'Connectivity', value: data.connectivity }
                ].filter(f => f.value)
            };
        default:
            return {
                title: data.model || 'Unknown Apple product',
                subtitle: null,
                subtitle2: null,
                fields: []
            };
    }
}

function AppleStoreOnline_renderDynamicEmbed(data) {
    const card = AppleStoreOnline_formatData(data);

    return `
        <div class="embed dynamicEmbed">
            <h1>${card.title}</h1>

            ${card.subtitle ? `<h2>${card.subtitle}</h2>` : ''}
            ${card.subtitle2 ? `<h3>${card.subtitle2}</h3>` : ''}

            <ul>
                ${card.fields.map(f => `
                    <li><b>${f.label}:</b> ${f.value}</li>
                `).join('')}
            </ul>

            <a href="${inputURL.value}" target="_blank">
                <button>View on apple.com</button>
            </a>
        </div>
    `;
}

parseButton.addEventListener('click', () => {
    const url = inputURL.value;

    const parsed = AppleStoreOnline_parseURL(url);
    const html = AppleStoreOnline_renderDynamicEmbed(parsed);

    output.innerHTML = html;
});

// helper functions

function titleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function AppleStoreOnline_formatModel(modelSlug) {
    return titleCase(modelSlug.replace(/-/g, ' '))
        // iPhone
        .replace(/\bIphone\b/g, 'iPhone')
        // Mac
        .replace(/\bMacbook\b/g, 'MacBook')
        .replace(/\bImac\b/g, 'iMac')
        .replace(/\bXdr\b/g, 'XDR')
        .replace(/\bMini\b/g, 'mini')
        // iPad
        .replace(/\bIpad\b/g, 'iPad');
}

function AppleStoreOnline_extractMatch(specSlug, regex, formatter = m => m[1]) {
    const match = specSlug.match(regex);
    return match ? formatter(match) : null;
}

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

MacBook Air
https://www.apple.com/shop/buy-mac/macbook-air/13-inch-sky-blue-m5-chip-10-core-cpu-10-core-gpu-32gb-memory-1tb-storage

MacBook Neo
https://www.apple.com/shop/buy-mac/macbook-neo/citrus-512gb

iMac
https://www.apple.com/shop/buy-mac/imac/24-inch-green-m4-chip-10-core-cpu-10-core-gpu-24gb-memory-512gb-storage-nano-texture-glass-vesa-mount-adapter

Mac mini
https://www.apple.com/shop/buy-mac/mac-mini/m4-pro-chip-14-core-cpu-20-core-gpu-48gb-memory-1tb-storage


BUY MAC DISPLAYS

Studio Display XDR
https://www.apple.com/shop/buy-mac/studio-display-xdr/nano-texture-glass-vesa-mount-adapter

-------

BUY WATCH

Apple Watch Series 11
https://www.apple.com/shop/buy-watch/apple-watch/46mm-cellular-jet-black-aluminum-neon-yellow-braided-solo-loop-size-6

*/