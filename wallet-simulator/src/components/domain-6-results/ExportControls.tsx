'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';

interface ExportControlsProps {
  className?: string;
}

export function ExportControls({ className = '' }: ExportControlsProps) {
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'json' as 'json' | 'csv',
    includeSummary: true,
    includeTransactions: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const exportResults = useStore((state) => state.exportResults);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      exportResults(exportOptions);
      setShowModal(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={() => setShowModal(true)}
        variant="secondary"
        className="flex items-center space-x-2"
      >
        <span>📊</span>
        <span>Export Results</span>
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Export Simulation Results"
      >
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Export Format
            </label>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportOptions.format === 'json'}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    format: e.target.value as 'json'
                  }))}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">JSON</span>
                <span className="text-xs text-muted-foreground">(Complete data structure)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportOptions.format === 'csv'}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    format: e.target.value as 'csv'
                  }))}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">CSV</span>
                <span className="text-xs text-muted-foreground">(Spreadsheet compatible)</span>
              </label>
            </div>
          </div>

          {/* Content Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Include Data
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSummary}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeSummary: e.target.checked
                  }))}
                  className="rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Summary & Statistics</span>
                  <p className="text-xs text-muted-foreground">
                    Simulation overview, performance metrics, archetype distribution
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeTransactions}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeTransactions: e.target.checked
                  }))}
                  className="rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Transaction Details</span>
                  <p className="text-xs text-muted-foreground">
                    Individual transaction records with timestamps, gas usage, status
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Export Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Export Information</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• JSON exports contain full data structure with all fields</li>
              <li>• CSV exports are optimized for spreadsheet analysis</li>
              <li>• Files are automatically downloaded to your browser</li>
              <li>• Large exports may take a moment to process</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              onClick={() => setShowModal(false)}
              variant="secondary"
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || (!exportOptions.includeSummary && !exportOptions.includeTransactions)}
              className="min-w-[100px]"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
