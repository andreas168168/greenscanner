import * as XLSX from 'xlsx';

async function readExcel(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        const co2TransportData = {};
        data.slice(1).forEach(row => { // Skip the first row
            const country = row[0];
            const co2PerKg = row[1];
            if (country && co2PerKg) {
                co2TransportData[country] = co2PerKg;
            }
        });

        return co2TransportData;
    } catch (error) {
        console.error('Error reading Excel file:', error);
        return {};
    }
}


export { readExcel };