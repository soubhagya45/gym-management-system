import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  exportToCsv(filename: string, data: any[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        let escaped = (val === null || val === undefined) ? '' : String(val);
        // Escape quotes
        escaped = escaped.replace(/"/g, '""');
        // Wrap in quotes if comma, newline or quote exists
        if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
          escaped = `"${escaped}"`;
        }
        return escaped;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    this.downloadFile(csvContent, 'text/csv;charset=utf-8;', `${filename}.csv`);
  }

  exportToExcel(filename: string, data: any[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    
    let xml = '<?xml version="1.0"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    xml += ' <Worksheet ss:Name="Sheet1">\n';
    xml += '  <Table>\n';
    
    // Headers Row
    xml += '   <Row>\n';
    for (const h of headers) {
      xml += `    <Cell><Data ss:Type="String">${this.escapeXml(h)}</Data></Cell>\n`;
    }
    xml += '   </Row>\n';

    // Data Rows
    for (const row of data) {
      xml += '   <Row>\n';
      for (const h of headers) {
        const val = row[h];
        const type = (typeof val === 'number') ? 'Number' : 'String';
        const formatted = (val === null || val === undefined) ? '' : String(val);
        xml += `    <Cell><Data ss:Type="${type}">${this.escapeXml(formatted)}</Data></Cell>\n`;
      }
      xml += '   </Row>\n';
    }

    xml += '  </Table>\n';
    xml += ' </Worksheet>\n';
    xml += '</Workbook>\n';

    this.downloadFile(xml, 'application/vnd.ms-excel;charset=utf-8;', `${filename}.xls`);
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  private downloadFile(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
