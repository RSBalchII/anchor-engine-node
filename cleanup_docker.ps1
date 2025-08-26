
# cleanup_docker.ps1  
$artifacts = @("Dockerfile", "docker-compose.yml")  

foreach ($file in $artifacts) {  
    if (Test-Path $file) {  
        Remove-Item $file -Force  
        Write-Host "Removed: $file"  
    }  
}  

Write-Host "Docker artifacts removed."