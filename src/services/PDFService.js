import { captureRef } from 'react-native-view-shot';
import { PDFDocument, PageSizes } from 'react-native-pdf-lib';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const EXPORT_DIR = FileSystem.documentDirectory + 'A4Prints/Exports/';

export async function ensureExportDir() {
  const dirInfo = await FileSystem.getInfoAsync(EXPORT_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true });
  }
}

export async function captureCanvas(ref, dpi = 300) {
  // A4 at 300 DPI: 2480x3508 px
  const width = Math.round(8.27 * dpi); // 8.27in x dpi
  const height = Math.round(11.69 * dpi); // 11.69in x dpi
  return await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width,
    height,
  });
}

export async function createPDF(imageUri, dpi = 300) {
  await ensureExportDir();
  const pdfPath = `${EXPORT_DIR}A4Print_${Date.now()}.pdf`;
  const pageWidth = Math.round(8.27 * dpi);
  const pageHeight = Math.round(11.69 * dpi);
  const pdf = PDFDocument.create(pdfPath)
    .addPages([
      PDFDocument.Page.create()
        .setMediaBox(pageWidth, pageHeight)
        .drawImage(imageUri, 'png', {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        })
    ]);
  await pdf.write();
  return pdfPath;
}

export async function sharePDF(pdfPath) {
  await Sharing.shareAsync(pdfPath);
} 