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
  Globe,
  Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Theme definitions with beautiful gradient combinations
const THEMES = [
  {
    id: 'gradient-purple',
    name: 'Purple Sunset',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Professional purple gradient - elegant and modern'
  },
  {
    id: 'gradient-ocean',
    name: 'Ocean Breeze',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'Fresh teal to green - calm and trustworthy'
  },
  {
    id: 'gradient-sunset',
    name: 'Fire Sunset',
    gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    description: 'Bold red to orange - energetic and eye-catching'
  },
  {
    id: 'gradient-forest',
    name: 'Deep Forest',
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    description: 'Dark teal to sage green - natural and sophisticated'
  },
  {
    id: 'gradient-midnight',
    name: 'Midnight Sky',
    gradient: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
    description: 'Professional dark blue - corporate and trustworthy'
  },
  {
    id: 'gradient-rose',
    name: 'Rose Garden',
    gradient: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
    description: 'Vibrant pink to red - playful and friendly'
  },
  {
    id: 'gradient-sky',
    name: 'Clear Sky',
    gradient: 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)',
    description: 'Classic blue gradient - reliable and clean'
  },
  {
    id: 'gradient-emerald',
    name: 'Emerald Dream',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
    description: 'Fresh green gradient - natural and eco-friendly'
  },
  {
    id: 'gradient-crimson',
    name: 'Crimson Power',
    gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    description: 'Rich red gradient - bold and confident'
  },
  {
    id: 'gradient-gold',
    name: 'Golden Hour',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    description: 'Warm gold gradient - premium and luxurious'
  }
];

export default function WidgetSettings() {
  const { client } = useCurrentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [config, setConfig] = useState({
    theme_name: 'gradient-purple',
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
          const themeName = data.theme_name || 'gradient-purple';
          setConfig({
            theme_name: themeName,
            position: data.position || 'bottom-right',
            widget_size: data.widget_size || 'medium',
            embed_code: data.embed_code || generateEmbedCode(client.client_id, themeName)
          });
        } else {
          // No config found, use defaults and generate embed code
          const embedCode = generateEmbedCode(client.client_id, 'gradient-purple');
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

  const generateEmbedCode = (clientId: string, themeName: string) => {
    // Use CDN for better performance and branding
    const widgetUrl = `https://cdn.klariqo.com/widgets/klariqo-widget.js?client_id=${clientId}&theme=${themeName}`;

    return `<!-- Klariqo Voice AI Widget -->
<script src="${widgetUrl}" defer></script>`;
  };

  const handleSave = async () => {
    if (!client?.client_id) {
      toast.error('Client not found');
      return;
    }

    setSaving(true);
    try {
      // Regenerate embed code with current settings including theme
      const updatedEmbedCode = generateEmbedCode(client.client_id, config.theme_name);

      // Update state with new embed code
      setConfig(prev => ({ ...prev, embed_code: updatedEmbedCode }));

      // Update or insert widget config
      const { error } = await supabase
        .from('widget_config')
        .upsert({
          client_id: client.client_id,
          theme_name: config.theme_name,
          position: config.position,
          widget_size: config.widget_size,
          embed_code: updatedEmbedCode,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedTheme = THEMES.find(t => t.id === config.theme_name) || THEMES[0];

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
          {/* Theme Picker */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-extralight">Theme</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose from our professionally designed gradient themes
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {THEMES.map((theme) => (
                <motion.button
                  key={theme.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfig(prev => ({ ...prev, theme_name: theme.id }))}
                  className={`relative rounded-xl p-4 border-2 transition-all ${
                    config.theme_name === theme.id
                      ? 'border-primary shadow-lg'
                      : 'border-black/[0.08] dark:border-white/8 hover:border-black/[0.15] dark:hover:border-white/15'
                  }`}
                >
                  {/* Gradient Preview */}
                  <div
                    className="w-full h-16 rounded-lg mb-3 shadow-md"
                    style={{ background: theme.gradient }}
                  />

                  {/* Theme Name */}
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center justify-between">
                      {theme.name}
                      {config.theme_name === theme.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {theme.description}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Position & Size Settings */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layout className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-extralight">Layout</h2>
              </div>
            </div>

            <div className="space-y-4">
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
                <h2 className="text-2xl font-extralight">Current Theme</h2>
              </div>
            </div>

            {/* Live Preview of Selected Theme */}
            <div className="space-y-4">
              <div
                className="w-full h-32 rounded-xl shadow-lg"
                style={{ background: selectedTheme.gradient }}
              />
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Theme:</span>
                  <strong className="text-foreground">{selectedTheme.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Position:</span>
                  <strong className="text-foreground">{config.position.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <strong className="text-foreground">{config.widget_size.charAt(0).toUpperCase() + config.widget_size.slice(1)}</strong>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
