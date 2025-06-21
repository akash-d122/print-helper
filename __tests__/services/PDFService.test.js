import { ensureExportDir, captureCanvas, createPDF, sharePDF } from '../../src/services/PDFService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { PDFDocument } from 'react-native-pdf-lib';
import { ToastAndroid } from 'react-native';

// Mock dependencies
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  documentDirectory: '/mock/documents/',
}));
jest.mock('expo-sharing');
jest.mock('react-native-view-shot');
jest.mock('react-native-pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn().mockReturnThis(),
    addPages: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined),
    Page: {
      create: jest.fn().mockReturnThis(),
      setMediaBox: jest.fn().mockReturnThis(),
      drawImage: jest.fn().mockReturnThis(),
    },
  },
}));

describe('PDFService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureExportDir', () => {
    it('should create directory if it does not exist', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: false });
      await ensureExportDir();
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(expect.stringContaining('A4Prints/Exports/'), { intermediates: true });
    });

    it('should not create directory if it already exists', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true });
      await ensureExportDir();
      expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('captureCanvas', () => {
    it('should capture a ref with correct DPI settings', async () => {
      const mockRef = { current: 'mock-ref' };
      await captureCanvas(mockRef, 300);
      expect(captureRef).toHaveBeenCalledWith(mockRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 2481, // 8.27 * 300
        height: 3507, // 11.69 * 300
      });
    });
  });

  describe('createPDF', () => {
    it('should create a PDF with the captured image', async () => {
      const imageUri = 'file:///captured.png';
      const resultPath = await createPDF(imageUri, 300);
      expect(PDFDocument.create).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
      expect(PDFDocument.Page.create().drawImage).toHaveBeenCalledWith(imageUri, 'png', expect.any(Object));
      expect(resultPath).toContain('A4Print_');
    });
  });

  describe('sharePDF', () => {
    it('should call the sharing module with the correct path', async () => {
      const pdfPath = '/path/to/my.pdf';
      await sharePDF(pdfPath);
      expect(Sharing.shareAsync).toHaveBeenCalledWith(pdfPath);
    });
  });
}); 