#!/bin/bash
# =========================================================================
# Clinic Management Platform - Automated MongoDB Backup Script (Linux/Unix)
# Configure this script as a Cron Job (e.g. 'crontab -e' -> '0 2 * * * /path/to/backup_db.sh')
# =========================================================================

# Configuration
DB_URI="mongodb+srv://<username>:<password>@<cluster_host>/clinic_management"
BACKUP_DIR="/var/backups/clinic"
KEEP_DAYS=7
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

echo "====================================================================="
echo "Starting MongoDB database backup..."
echo "Timestamp: $TIMESTAMP"
echo "Output folder: $BACKUP_DIR/backup_$TIMESTAMP"
echo "====================================================================="

mkdir -p "$BACKUP_DIR"

# Run mongodump (Ensure MongoDB Database Tools are installed on server)
mongodump --uri="$DB_URI" --out="$BACKUP_DIR/backup_$TIMESTAMP"

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Database backup saved successfully."
else
    echo "[ERROR] Backup failed. Verify your connection settings and MongoDB URI."
    exit 1
fi

# Purge backups older than KEEP_DAYS to save disk space
echo "Cleaning up backup folders older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -maxdepth 1 -name "backup_*" -type d -mtime +$KEEP_DAYS -exec rm -rf {} \;

echo "Done."
