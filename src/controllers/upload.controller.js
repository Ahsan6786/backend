const fs = require('fs');
const parseExcel = require('../utils/excelParser');
const { bulkIngestData, preFlightAnalysis } = require('../services/ingestion.service');

const uploadController = {
  /**
   * Stage 1: Pre-flight Analysis
   */
  handlePreFlight: async (req, res) => {
    let filePath = null;
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
      
      filePath = req.file.path;
      const rawData = parseExcel(filePath);
      
      if (!rawData || rawData.length === 0) {
        if (filePath) fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'File is empty.' });
      }

      const analysis = await preFlightAnalysis(rawData);

      // Cleanup temp file after analysis
      fs.unlink(filePath, () => {});

      return res.status(200).json({
        success: true,
        analysis
      });
    } catch (error) {
      if (filePath) fs.unlink(filePath, () => {});
      return res.status(500).json({ success: false, message: 'Analysis failed', error: error.message });
    }
  },

  /**
   * Stage 2: Universal Bulk Ingestion
   */
  handleUniversalUpload: async (req, res) => {
    let filePath = null;
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

      const { strategy = 'overwrite' } = req.body;
      filePath = req.file.path;
      const rawData = parseExcel(filePath);

      if (!rawData || rawData.length === 0) {
        if (filePath) fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'File is empty.' });
      }

      // Process Ingestion with chosen strategy
      const result = await bulkIngestData(rawData, strategy);

      // Cleanup
      fs.unlink(filePath, (err) => {
        if (err) console.error(`[Upload] Cleanup failed: ${filePath}`, err);
      });

      res.status(200).json({
        success: true,
        message: 'System ingestion process completed.',
        summary: result
      });
    } catch (error) {
      console.error('[Upload] Fatal Error:', error);
      if (filePath) fs.unlink(filePath, () => {});
      res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
    }
  }
};

module.exports = uploadController;
