const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('xlsx');

const FIREBASE_DB_URL = 'https://qlcvph-default-rtdb.firebaseio.com/cong_van.json';

function fetchFirebaseData() {
  return new Promise((resolve, reject) => {
    https.get(FIREBASE_DB_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function isCongVanDen(loai) {
  if (!loai) return false;
  const lower = loai.toLowerCase();
  return lower.includes('đến') || lower.includes('den') || lower === 'congvanden';
}

function formatDateToVN(dateValue) {
  if (!dateValue) return '';
  if (typeof dateValue === 'number' || (!isNaN(dateValue) && !String(dateValue).includes('-') && !String(dateValue).includes('/'))) {
    const d = new Date(Number(dateValue));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  const str = String(dateValue).trim();
  if (str.includes('T')) {
    const isoDatePart = str.split('T')[0];
    const parts = isoDatePart.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return str;
}

async function main() {
  console.log('Fetching data from Firebase RTDB...');
  const data = await fetchFirebaseData();

  if (!data) {
    console.log('No data found on Firebase!');
    return;
  }

  const allDispatches = [];

  if (data.cong_van_den && typeof data.cong_van_den === 'object') {
    Object.keys(data.cong_van_den).forEach((key) => {
      allDispatches.push({
        id: key,
        is_subnode_den: true,
        ...data.cong_van_den[key]
      });
    });
  }

  if (data.cong_van_di && typeof data.cong_van_di === 'object') {
    Object.keys(data.cong_van_di).forEach((key) => {
      allDispatches.push({
        id: key,
        is_subnode_di: true,
        ...data.cong_van_di[key]
      });
    });
  }

  // Flatten any additional root keys if any
  Object.keys(data).forEach((key) => {
    if (key !== 'cong_van_den' && key !== 'cong_van_di') {
      allDispatches.push({
        id: key,
        ...data[key]
      });
    }
  });

  // Sort newest first: ngay_ban_hanh descending, then created_at descending
  allDispatches.sort((a, b) => {
    if (b.ngay_ban_hanh !== a.ngay_ban_hanh) {
      return (b.ngay_ban_hanh || '').localeCompare(a.ngay_ban_hanh || '');
    }
    return (b.created_at || 0) - (a.created_at || 0);
  });

  console.log(`Total dispatches fetched: ${allDispatches.length}`);

  const headers = [
    'Thời gian CV đến',
    'Số / Ký hiệu',
    'Phân loại',
    'Loại văn bản',
    'Đơn vị ban hành / Chi tiết',
    'Ngày ban hành',
    'Trích yếu nội dung',
    'Link đính kèm'
  ];

  const exportData = allDispatches.map((item) => {
    const isDen = isCongVanDen(item.loai_cong_van);
    const displayLoai = isDen ? 'CV đến' : 'CV đi';

    let coQuan = item.co_quan_ban_hanh || item.phong_ban || '';
    if (!isDen && item.don_vi_chi_tiet) {
      coQuan = `${coQuan} (${item.don_vi_chi_tiet})`;
    }

    const linkDrive = item.link_google_drive || item.drive_link || '';
    const thoiGianDisplay = item.ngay_den || item.created_at || item.ngay_ban_hanh || item.ngay_nhan;

    return {
      'Thời gian CV đến': formatDateToVN(thoiGianDisplay),
      'Số / Ký hiệu': item.so_ky_hieu || '',
      'Phân loại': displayLoai,
      'Loại văn bản': item.loai_van_ban || '',
      'Đơn vị ban hành / Chi tiết': coQuan,
      'Ngày ban hành': formatDateToVN(item.ngay_ban_hanh),
      'Trích yếu nội dung': item.trich_yeu || '',
      'Link đính kèm': linkDrive
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
  worksheet['!rows'] = [{ hpt: 26 }];

  const colWidths = headers.map(header => ({ wch: Math.max(header.length + 4, 15) }));

  exportData.forEach((row, idx) => {
    const rowNum = idx + 2;
    headers.forEach((header, colIdx) => {
      const val = row[header] ? String(row[header]) : '';
      if (val.length + 3 > colWidths[colIdx].wch) {
        colWidths[colIdx].wch = Math.min(val.length + 3, 60);
      }
    });

    const linkUrl = row['Link đính kèm'];
    if (linkUrl && (linkUrl.startsWith('http://') || linkUrl.startsWith('https://'))) {
      const cellRef = 'H' + rowNum;
      if (worksheet[cellRef]) {
        worksheet[cellRef].l = { Target: linkUrl, Tooltip: linkUrl };
      }
    }
  });

  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Công văn');

  // Format date according to Vietnam Timezone (Asia/Ho_Chi_Minh - UTC+7)
  const vnDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const fileName = `Danh_sach_cong_van_${vnDateStr}.xlsx`;
  const filePath = path.join(backupDir, fileName);

  XLSX.writeFile(workbook, filePath);
  console.log(`Successfully created backup file: ${filePath}`);
}

main().catch((err) => {
  console.error('Backup script failed:', err);
  process.exit(1);
});
