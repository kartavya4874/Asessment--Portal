# setup-github-secrets.ps1
# This script uses the 'gh' CLI to set up secrets for your repository.
# You must be logged in via 'gh auth login' first.

Function Set-GitSecret {
    param($Name, $Value)
    if ($Value -and $Value -ne "PLACEHOLDER") {
        Write-Host "Setting secret: $Name..." -ForegroundColor Cyan
        echo "$Value" | gh secret set $Name
    } else {
        Write-Host "Skipping secret (no value provided): $Name" -ForegroundColor Yellow
    }
}

# --- Known Values ---
$MONGODB_URI = "mongodb+srv://kartavyabaluja453:XSIE10xhp8zeiMh8@cluster0.wwcan.mongodb.net/?appName=Cluster0&tlsAllowInvalidCertificates=true"
$DB_NAME = "ai_lab_assessment"
$JWT_SECRET = "WwtLkeXpJB94k8xNk3KZ7SXchpxFMSjwB0MJd1XKsy3"
$FIREBASE_STORAGE_BUCKET = "gs://assessment-8b220.firebasestorage.app"
$ADMIN_CREDENTIALS = 'Kartavya|kartavya.baluja@geetauniversity.edu.in|Kartavya.Baluja@123,Lab Coordinator|admin2@geetauniversity.edu.in|admin123'
$GCP_PROJECT_ID = "assessment-8b220"

# --- REQUIRED: User Input or Manual Setting ---
# Change these values or the script will prompt you (if you update it to do so)
$GCP_SA_KEY = "PLACEHOLDER" # Path to your GCP Service Account JSON key
$FIREBASE_CREDENTIALS_JSON = "PLACEHOLDER" # Content of your Firebase Admin SDK JSON
$FRONTEND_URL = "PLACEHOLDER" # e.g., https://assessment-8b220.web.app
$VITE_API_URL = "PLACEHOLDER" # e.g., https://ai-lab-backend-xyz.a.run.app

Write-Host "--- GitHub Secrets Setup ---" -ForegroundColor Green

Set-GitSecret "MONGODB_URI" $MONGODB_URI
Set-GitSecret "DB_NAME" $DB_NAME
Set-GitSecret "JWT_SECRET" $JWT_SECRET
Set-GitSecret "FIREBASE_STORAGE_BUCKET" $FIREBASE_STORAGE_BUCKET
Set-GitSecret "ADMIN_CREDENTIALS" $ADMIN_CREDENTIALS
Set-GitSecret "GCP_PROJECT_ID" $GCP_PROJECT_ID

Write-Host "`nSecret setup complete (for known values).`n" -ForegroundColor Green
Write-Host "Please set the remaining secrets (GCP_SA_KEY, FIREBASE_CREDENTIALS_JSON, etc.) manually" -ForegroundColor Yellow
Write-Host "using: gh secret set NAME -b 'VALUE'" -ForegroundColor Yellow
