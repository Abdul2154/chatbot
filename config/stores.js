const stores = {
    central: [
        'Doornkop',
        'Kus',
        'Mponeng',
        'Moab hostel',
        'Moab shaft'
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
        'Target',
        'Marula'
    ]
};

function getAllStores() {
    return [...stores.central, ...stores.welkom, ...stores.rtb];
}

function getStoresByRegion(region) {
    return stores[region] || [];
}

module.exports = { stores, getAllStores, getStoresByRegion };