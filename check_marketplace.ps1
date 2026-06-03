[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$url = "https://nvwax.proclaw.cc/api/team-skills/marketplace"
Write-Host ("")
Write-Host ("=== GET " + $url + " ===")
$req = [System.Net.WebRequest]::Create($url)
$req.Method = "GET"
$req.Timeout = 15000
try {
  $resp = $req.GetResponse()
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $body = $reader.ReadToEnd()
  $reader.Close()
  Write-Host ("Status: " + $resp.StatusCode)
  Write-Host ("Body: " + $body)
} catch [System.Net.WebException] {
  $exResp = $_.Exception.Response
  Write-Host ("Status: " + $exResp.StatusCode)
  $reader = New-Object System.IO.StreamReader($exResp.GetResponseStream())
  Write-Host ("Error: " + $reader.ReadToEnd())
  $reader.Close()
}
Write-Host ("")

$url2 = "https://nvwax.proclaw.cc/marketplace/team-skills/team-skill-dev-001"
Write-Host ("=== GET " + $url2 + " ===")
$req2 = [System.Net.WebRequest]::Create($url2)
$req2.Method = "GET"
$req2.AllowAutoRedirect = $true
$req2.Timeout = 15000
try {
  $resp2 = $req2.GetResponse()
  Write-Host ("Status: " + $resp2.StatusCode)
  Write-Host ("OK - team detail page accessible")
} catch [System.Net.WebException] {
  $exResp2 = $_.Exception.Response
  Write-Host ("Status: " + $exResp2.StatusCode)
}
