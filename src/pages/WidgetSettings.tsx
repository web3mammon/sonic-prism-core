import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui/modern-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  Copy,
  CheckCircle,
  Loader2,
  Palette,
  Layout,
  MessageSquare,
  Globe
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WidgetSettings() {
  const { client } = useCurrentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [config, setConfig] = useState({
    primary_color: '#ef4444',
    secondary_color: '#1a1a1a',
    text_color: '#ffffff',
    position: 'bottom-right',
    widget_size: 'medium',
    embed_code: ''
  });

  // Load widget config from database
  useEffect(() => {
    async function loadWidgetConfig() {
      if (!client?.client_id) return;

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('widget_config')
          .select('*')
          .eq('client_id', client.client_id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error loading widget config:', error);
          toast.error('Failed to load widget settings');
          return;
        }

        if (data) {
          setConfig({
            primary_color: data.primary_color || '#ef4444',
            secondary_color: data.secondary_color || '#1a1a1a',
            text_color: data.text_color || '#ffffff',
            position: data.position || 'bottom-right',
            widget_size: data.widget_size || 'medium',
            embed_code: data.embed_code || generateEmbedCode(client.client_id)
          });
        } else {
          // No config found, use defaults and generate embed code
          const embedCode = generateEmbedCode(client.client_id);
          setConfig(prev => ({ ...prev, embed_code: embedCode }));
        }
      } catch (error) {
        console.error('Error loading widget config:', error);
        toast.error('Failed to load widget settings');
      } finally {
        setLoading(false);
      }
    }

    loadWidgetConfig();
  }, [client?.client_id]);

  const generateEmbedCode = (clientId: string) => {
    // Use CDN for better performance and branding
    const widgetUrl = `https://cdn.klariqo.com/widgets/klariqo-widget.js`;

    return `<!-- Klariqo Voice AI Widget -->
<script>
  window.klariqoConfig = {
    clientId: '${clientId}',
    primaryColor: '${config.primary_color}',
    position: '${config.position}',
    size: '${config.widget_size}'
  };
</script>
<script src="${widgetUrl}" defer></script>`;
  };

  const handleSave = async () => {
    if (!client?.client_id) {
      toast.error('Client not found');
      return;
    }

    setSaving(true);
    try {
      // Update or insert widget config
      const { error } = await supabase
        .from('widget_config')
        .upsert({
          client_id: client.client_id,
          primary_color: config.primary_color,
          secondary_color: config.secondary_color,
          text_color: config.text_color,
          position: config.position,
          widget_size: config.widget_size,
          embed_code: config.embed_code,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      toast.success('Widget settings saved successfully!');
    } catch (error) {
      console.error('Error saving widget settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(config.embed_code);
    setCopied(true);
    toast.success('Embed code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleColorChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-5xl font-extralight mb-2">Widget Settings</h1>
        <p className="text-muted-foreground">
          Customize your website voice chat widget's appearance and behavior
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Appearance Settings */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-extralight">Appearance</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="primary_color"
                    type="color"
                    value={config.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                    placeholder="#ef4444"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={config.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_color">Text Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="text_color"
                    type="color"
                    value={config.text_color}
                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.text_color}
                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Widget Position</Label>
                <Select value={config.position} onValueChange={(value) => setConfig(prev => ({ ...prev, position: value }))}>
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="widget_size">Widget Size</Label>
                <Select value={config.widget_size} onValueChange={(value) => setConfig(prev => ({ ...prev, widget_size: value }))}>
                  <SelectTrigger id="widget_size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <ModernButton
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </ModernButton>
        </motion.div>

        {/* Embed Code Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-extralight">Installation</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Copy this code and paste it before the closing &lt;/body&gt; tag in your website's HTML
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <pre className="bg-black/[0.05] dark:bg-white/[0.05] rounded-xl p-4 text-sm overflow-x-auto">
                  <code className="text-muted-foreground">{config.embed_code}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopyEmbedCode}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Note:</strong> After saving your settings above, make sure to update the embed code on your website to reflect the new customizations.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layout className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-extralight">Widget Preview</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Visit your website after installing the widget to see it in action with your customizations
              </p>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                <span>Position: <strong className="text-foreground">{config.position.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                <span>Size: <strong className="text-foreground">{config.widget_size.charAt(0).toUpperCase() + config.widget_size.slice(1)}</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                <span>Primary Color: <strong className="text-foreground">{config.primary_color}</strong></span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
