/**
 * WilayahPicker - Library JS Reusable untuk Dropdown Wilayah & Peta Leaflet
 */
class WilayahPicker {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://www.emsifa.com/api-wilayah-indonesia/v2';
    
    // Ambil elemen HTML
    this.provEl = typeof options.provSelect === 'string' ? document.getElementById(options.provSelect) : options.provSelect;
    this.kabEl = typeof options.kabSelect === 'string' ? document.getElementById(options.kabSelect) : options.kabSelect;
    this.kecEl = typeof options.kecSelect === 'string' ? document.getElementById(options.kecSelect) : options.kecSelect;
    this.kelEl = typeof options.kelSelect === 'string' ? document.getElementById(options.kelSelect) : options.kelSelect;
    this.mapEl = typeof options.mapContainer === 'string' ? document.getElementById(options.mapContainer) : options.mapContainer;
    
    // Callback event saat lokasi dipilih
    this.onSelectCallback = options.onSelect || null;

    this.dataStore = { prov: {}, kab: {}, kec: {}, kel: {} };
    this.lastCoords = { lat: -2.548926, lng: 118.0148634 };

    if (this.mapEl) this.initMap();
    this.initEvents();
    this.loadProvinces();
  }

  // 1. Inisialisasi Peta Leaflet
  initMap() {
    this.map = L.map(this.mapEl).setView([this.lastCoords.lat, this.lastCoords.lng], 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    }).addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);
  }

  extractList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  }

  populateOptions(selectElement, rawData, placeholder, storageKey) {
    if (!selectElement) return;
    const list = this.extractList(rawData);
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    
    this.dataStore[storageKey] = {};
    list.forEach(item => {
      const id = item.id || item.code;
      this.dataStore[storageKey][id] = item;

      const option = document.createElement('option');
      option.value = id;
      option.textContent = item.name;
      selectElement.appendChild(option);
    });
    selectElement.disabled = false;
  }

  resetOptions(selectElement, placeholder) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    selectElement.disabled = true;
  }

  drawPinAndCircle(lat, lng, zoomLevel, radiusMeters, labelText) {
    if (!this.map || !this.layerGroup) return;

    this.layerGroup.clearLayers();

    if (lat && lng) {
      this.lastCoords = { lat, lng };
    } else {
      lat = this.lastCoords.lat;
      lng = this.lastCoords.lng;
    }

    // Lingkaran Area
    L.circle([lat, lng], {
      color: '#e53e3e',
      fillColor: '#feb2b2',
      fillOpacity: 0.45,
      radius: radiusMeters,
      weight: 2
    }).addTo(this.layerGroup);

    // Marker Pin
    const marker = L.marker([lat, lng]).addTo(this.layerGroup);
    marker.bindPopup(`<b>${labelText}</b>`).openPopup();

    // Animasi Peta
    this.map.flyTo([lat, lng], zoomLevel, { animate: true, duration: 1 });
  }

  triggerCallback() {
    if (typeof this.onSelectCallback === 'function') {
      const provData = this.provEl && this.provEl.value ? this.dataStore.prov[this.provEl.value] : null;
      const kabData = this.kabEl && this.kabEl.value ? this.dataStore.kab[this.kabEl.value] : null;
      const kecData = this.kecEl && this.kecEl.value ? this.dataStore.kec[this.kecEl.value] : null;
      const kelData = this.kelEl && this.kelEl.value ? this.dataStore.kel[this.kelEl.value] : null;

      this.onSelectCallback({
        provinsi: provData,
        kabupaten: kabData,
        kecamatan: kecData,
        kelurahan: kelData
      });
    }
  }

  // --- API Fetching & Events ---
  loadProvinces() {
    if (!this.provEl) return;
    fetch(`${this.baseUrl}/provinces.json`)
      .then(res => res.json())
      .then(data => this.populateOptions(this.provEl, data, '-- Pilih Provinsi --', 'prov'))
      .catch(() => this.provEl.innerHTML = '<option value="">Gagal memuat data</option>');
  }

  initEvents() {
    // Select Provinsi
    if (this.provEl) {
      this.provEl.addEventListener('change', (e) => {
        const id = e.target.value;
        this.resetOptions(this.kabEl, '-- Pilih Kabupaten/Kota --');
        this.resetOptions(this.kecEl, '-- Pilih Kecamatan --');
        this.resetOptions(this.kelEl, '-- Pilih Kelurahan/Desa --');
        this.triggerCallback();

        if (!id) return;
        const item = this.dataStore.prov[id];
        this.drawPinAndCircle(item?.lat, item?.lng, 8, 40000, `Provinsi ${item?.name}`);

        if (this.kabEl) {
          this.kabEl.innerHTML = '<option value="">-- Memuat Kabupaten/Kota... --</option>';
          fetch(`${this.baseUrl}/regencies/${id}.json`)
            .then(res => res.json())
            .then(data => this.populateOptions(this.kabEl, data, '-- Pilih Kabupaten/Kota --', 'kab'));
        }
      });
    }

    // Select Kabupaten
    if (this.kabEl) {
      this.kabEl.addEventListener('change', (e) => {
        const id = e.target.value;
        this.resetOptions(this.kecEl, '-- Pilih Kecamatan --');
        this.resetOptions(this.kelEl, '-- Pilih Kelurahan/Desa --');
        this.triggerCallback();

        if (!id) return;
        const item = this.dataStore.kab[id];
        this.drawPinAndCircle(item?.lat, item?.lng, 11, 12000, item?.name);

        if (this.kecEl) {
          this.kecEl.innerHTML = '<option value="">-- Memuat Kecamatan... --</option>';
          fetch(`${this.baseUrl}/districts/${id}.json`)
            .then(res => res.json())
            .then(data => this.populateOptions(this.kecEl, data, '-- Pilih Kecamatan --', 'kec'));
        }
      });
    }

    // Select Kecamatan
    if (this.kecEl) {
      this.kecEl.addEventListener('change', (e) => {
        const id = e.target.value;
        this.resetOptions(this.kelEl, '-- Pilih Kelurahan/Desa --');
        this.triggerCallback();

        if (!id) return;
        const item = this.dataStore.kec[id];
        this.drawPinAndCircle(item?.lat, item?.lng, 13, 3000, `Kecamatan ${item?.name}`);

        if (this.kelEl) {
          this.kelEl.innerHTML = '<option value="">-- Memuat Kelurahan/Desa... --</option>';
          fetch(`${this.baseUrl}/villages/${id}.json`)
            .then(res => res.json())
            .then(data => this.populateOptions(this.kelEl, data, '-- Pilih Kelurahan/Desa --', 'kel'));
        }
      });
    }

    // Select Kelurahan
    if (this.kelEl) {
      this.kelEl.addEventListener('change', (e) => {
        const id = e.target.value;
        this.triggerCallback();

        if (!id) return;
        const item = this.dataStore.kel[id];
        this.drawPinAndCircle(item?.lat, item?.lng, 15, 800, `Desa/Kel. ${item?.name}`);
      });
    }
  }
}
