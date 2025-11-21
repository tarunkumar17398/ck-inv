import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const RfidApiTest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.log("=== STEP 1: Starting API Fetch ===");
      console.log("URL:", 'https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export');
      
      const response = await fetch('https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export');
      
      console.log("=== STEP 2: Response Received ===");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("OK:", response.ok);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log("=== STEP 3: Parsing JSON ===");
      const result = await response.json();
      
      console.log("=== STEP 4: Analyzing Response Structure ===");
      console.log("Full Response Object:", result);
      console.log("typeof result:", typeof result);
      console.log("result.success:", result.success);
      console.log("result.count:", result.count);
      console.log("result.data:", result.data ? "EXISTS" : "MISSING");
      console.log("typeof result.data:", typeof result.data);
      console.log("Array.isArray(result.data):", Array.isArray(result.data));
      console.log("result.data.length:", result.data?.length);
      
      console.log("=== STEP 5: Checking Data Array ===");
      if (result.data && result.data.length > 0) {
        console.log("First item:", result.data[0]);
        console.log("First item keys:", Object.keys(result.data[0]));
      }
      
      console.log("=== STEP 6: What RFID Scanner Should Do ===");
      console.log("const items = result.data;  // This gives you the array");
      console.log("items.length:", result.data?.length);
      console.log("If items.length is 0, check if you're looking for 'success' field!");
      
      setData({
        ...result,
        debug: {
          responseType: typeof result,
          hasSuccess: 'success' in result,
          hasCount: 'count' in result,
          hasData: 'data' in result,
          dataIsArray: Array.isArray(result.data),
          dataLength: result.data?.length,
          firstItem: result.data?.[0],
          rawJSON: JSON.stringify(result, null, 2)
        }
      });
      
      toast.success(`Successfully loaded ${result.count} items from API`);
      
    } catch (err: any) {
      console.error("=== ERROR ===");
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      setError(err.message || "Failed to fetch data");
      toast.error("Failed to fetch data from API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">RFID API Test</h1>
            <p className="text-muted-foreground">Test the RFID Export API endpoint</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Endpoint</CardTitle>
            <CardDescription>
              <code className="text-xs bg-muted p-2 rounded block mt-2">
                https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testApi} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Test API"
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>API Response Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Success:</span>
                  <span className={data.success ? "text-green-600" : "text-red-600"}>
                    {data.success ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Count:</span>
                  <span className="text-2xl font-bold">{data.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Data Array Length:</span>
                  <span className="text-2xl font-bold">{data.data?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🔍 Debug Information</CardTitle>
                <CardDescription>Use this to fix your RFID Scanner App</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded space-y-2">
                  <p className="font-semibold text-lg">Response Structure:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Has 'success' field:</div>
                    <div className="font-mono">{data.debug?.hasSuccess ? "✓ YES" : "✗ NO"}</div>
                    
                    <div>Has 'count' field:</div>
                    <div className="font-mono">{data.debug?.hasCount ? "✓ YES" : "✗ NO"}</div>
                    
                    <div>Has 'data' field:</div>
                    <div className="font-mono">{data.debug?.hasData ? "✓ YES" : "✗ NO"}</div>
                    
                    <div>Data is Array:</div>
                    <div className="font-mono">{data.debug?.dataIsArray ? "✓ YES" : "✗ NO"}</div>
                    
                    <div>Data Length:</div>
                    <div className="font-mono font-bold text-lg">{data.debug?.dataLength}</div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="font-semibold text-lg mb-2">⚠️ Fix for RFID Scanner App:</p>
                  <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`// WRONG - Checking for 'success' field
if (result.success) {
  const items = result.data; // This won't work!
}

// CORRECT - Use data directly
const response = await fetch(apiUrl);
const result = await response.json();
const items = result.data || [];  // Always use result.data

console.log("Items loaded:", items.length);
// Should show: Items loaded: ${data.count}`}
                  </pre>
                </div>

                <div className="bg-muted p-4 rounded">
                  <p className="font-semibold mb-2">First Item Structure:</p>
                  <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
                    {JSON.stringify(data.debug?.firstItem, null, 2)}
                  </pre>
                </div>

                <details className="bg-muted p-4 rounded">
                  <summary className="font-semibold cursor-pointer">View Full Raw JSON Response</summary>
                  <pre className="text-xs bg-background p-3 rounded overflow-x-auto mt-2 max-h-96">
                    {data.debug?.rawJSON}
                  </pre>
                </details>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>First 10 Items</CardTitle>
                <CardDescription>Showing first 10 items from the API response</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>RFID-EPC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data?.slice(0, 10).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item["ITEM CODE"]}</TableCell>
                        <TableCell>{item["PARTICULARS"] || "-"}</TableCell>
                        <TableCell>{item["SIZE"] || "-"}</TableCell>
                        <TableCell>{item["Weight"] || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{item["RFID-EPC"] || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default RfidApiTest;
