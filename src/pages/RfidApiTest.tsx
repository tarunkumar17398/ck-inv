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
      console.log("Fetching from API...");
      const response = await fetch('https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export');
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("API Response:", result);
      console.log("Item count from API:", result.count);
      console.log("Data array length:", result.data?.length);
      
      setData(result);
      toast.success(`Successfully loaded ${result.count} items from API`);
      
    } catch (err: any) {
      console.error("Error fetching from API:", err);
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
