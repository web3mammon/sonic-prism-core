import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileAudio,
  Calendar,
  Filter,
  Loader2,
  Download
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useAudioFiles } from "@/hooks/useAudioFiles";

export default function AudioFiles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { client, loading: clientLoading } = useCurrentClient();
  const { audioFiles, loading: filesLoading, error } = useAudioFiles(client?.client_id || null);

  const handleDownload = (file: any) => {
    const a = document.createElement('a');
    a.href = file.file_path;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (clientLoading || filesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading audio files: {error}
      </div>
    );
  }

  const filteredFiles = audioFiles.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.text_content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || file.category === typeFilter;
    return matchesSearch && matchesType;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "introductions":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Introduction</Badge>;
      case "pricing":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Pricing</Badge>;
      case "miscellaneous":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">Miscellaneous</Badge>;
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };



  return (
    <div className="space-y-6 font-manrope">
      <div>
        <h1 className="text-3xl font-bold">Audio Files</h1>
        <p className="text-muted-foreground">
          Manage pre-recorded audio snippets used by your AI agent during calls
        </p>
      </div>

      {/* Audio Files Management */}
      <Card>
        <CardHeader>
          <CardTitle className="font-extralight">Audio Snippets</CardTitle>
          <CardDescription>
            Audio files in telephony format (.ulaw) used during live calls. Download to review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename, category, or text content..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="introductions">Introductions</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
            </Button>
          </div>

          {/* Audio Files Grid */}
          <div className="space-y-4">
            {filteredFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-lg">
                    <FileAudio className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{file.file_name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{file.text_content}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {getCategoryBadge(file.category)}
                  <div className="flex items-center space-x-2 text-sm">
                    {file.metadata?.exists ? (
                      <span className="text-green-600">✓ Available</span>
                    ) : (
                      <span className="text-red-600">✗ Missing</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    disabled={!file.metadata?.exists}
                    title="Download telephony audio file"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No audio snippets found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}