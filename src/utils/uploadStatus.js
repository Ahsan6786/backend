/**
 * GLOBAL UPLOAD STATUS TRACKER
 * In-memory singleton to track the progress of active bulk uploads.
 */
class UploadStatusTracker {
    constructor() {
        this.status = {
            isUploading: false,
            total: 0,
            processed: 0,
            startTime: null,
            lastBatchTime: null,
            isCancelled: false,
            errors: []
        };
    }

    start(total) {
        this.status = {
            isUploading: true,
            total: total,
            processed: 0,
            startTime: Date.now(),
            lastBatchTime: Date.now(),
            isCancelled: false,
            errors: []
        };
    }

    update(processedCount, error = null) {
        this.status.processed += processedCount;
        this.status.lastBatchTime = Date.now();
        if (error) {
            this.status.errors.push(error);
        }
    }

    cancel() {
        this.status.isUploading = false;
        this.status.isCancelled = true;
    }

    complete() {
        this.status.isUploading = false;
    }

    getStatus() {
        return this.status;
    }

    shouldCancel() {
        return this.status.isCancelled;
    }
}

module.exports = new UploadStatusTracker();
