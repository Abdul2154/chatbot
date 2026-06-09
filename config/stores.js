const stores = {
    central: [
        'Doornkop',
        'Kus',
        'Mponeng',
        'Moab hostel',
        'Moab shaft',
        'JamesPark'
    ],
    welkom: [
        'Tshepong',
        'Phakisa',
        'Target',
        'Masimong',
        'Joel'
    ],
    rtb: [
        'Eland',
        'Zondereinde',
        'Union',
        'Richard',
        'Spud',
        '12',
        '20',
        '16',
        'Ratanang',
        'Hospital',
        'Simunye',
        'Marula',
        '11 shaft',
        '11C',
        'Minpro',
        '10 shaft',
        'North Baf',
        'South Baf',
        'Styldrift'
    ]
};

function getAllStores() {
    return [...stores.central, ...stores.welkom, ...stores.rtb];
}

function getStoresByRegion(region) {
    return stores[region] || [];
}

module.exports = { stores, getAllStores, getStoresByRegion };