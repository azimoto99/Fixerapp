# PowerShell script to test Stripe Connect endpoints

Write-Host "Testing Stripe Connect health endpoint..."
Invoke-RestMethod -Uri "http://localhost:5000/api/stripe/connect/health" -Method GET -ContentType "application/json" -Verbose

Write-Host "`nTesting Stripe Connect create-account endpoint..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/stripe/connect/create-account" -Method POST -ContentType "application/json" -Body "{}" -Verbose
    Write-Host "Response: $response"
} 
catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)"
}
