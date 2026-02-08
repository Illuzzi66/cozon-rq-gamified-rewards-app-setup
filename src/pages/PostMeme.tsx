import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { InterstitialAd } from '@/components/ads/InterstitialAd';
import { ArrowLeft, Upload, Video, Crown, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MEME_CATEGORIES = [
  'Funny',
  'Relatable',
  'Wholesome',
  'Dark Humor',
  'Animals',
  'Gaming',
  'Sports',
  'Tech',
  'Random'
];

export const PostMeme: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const [adWatched, setAdWatched] = useState(false);

  // Redirect if not premium
  if (!profile?.is_premium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/memes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Post Meme</h1>
          </div>

          <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-premium/20 to-secondary/20 border-premium/30">
            <Crown className="w-16 h-16 text-premium mx-auto" />
            <h2 className="text-2xl font-bold">Premium Feature</h2>
            <p className="text-muted-foreground">
              Upgrade to Premium to post memes and earn 5¢ per post!
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✨ Post unlimited memes</p>
              <p>💰 Earn 5¢ (13 coins) per post</p>
              <p>🚀 2.5× earnings on all activities</p>
              <p>⚡ Instant withdrawals</p>
            </div>
            <Button
              onClick={() => navigate('/premium')}
              variant="premium"
              size="lg"
              className="mt-4"
            >
              Upgrade to Premium - $2
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const handleWatchAd = () => {
    setShowInterstitialAd(true);
  };

  const handleAdCompleted = () => {
    setAdWatched(true);
    toast({
      title: '✅ Ad Watched',
      description: 'You can now upload your meme!',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adWatched) {
      toast({
        title: 'Watch Ad Required',
        description: 'Please watch an ad before posting your meme',
        variant: 'destructive',
      });
      return;
    }

    if (!imageUrl || !caption || !category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data, error } = await supabase.rpc('post_meme', {
        p_user_id: profile.user_id,
        p_image_url: imageUrl,
        p_caption: caption,
        p_category: category,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '🎉 Meme Posted!',
          description: `You earned ${data.coins_earned} coins!`,
        });

        await refreshProfile();
        navigate('/memes');
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error posting meme:', error);
      toast({
        title: 'Error',
        description: 'Failed to post meme',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/memes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Post Meme</h1>
              <p className="text-sm text-muted-foreground">Earn 5¢ per post</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-premium/10 px-3 py-2 rounded-full">
            <Crown className="w-5 h-5 text-premium" />
            <span className="text-sm font-semibold text-premium">Premium</span>
          </div>
        </div>

        {/* Earnings Info */}
        <Card className="p-4 bg-gradient-to-r from-gold/20 to-gold/10 border-gold/30">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-gold" />
            <div>
              <p className="font-semibold">Earn 13 coins per post</p>
              <p className="text-sm text-muted-foreground">5¢ base + 2.5× Premium bonus</p>
            </div>
          </div>
        </Card>

        {/* Ad Requirement */}
        {!adWatched && (
          <Card className="p-6 text-center space-y-4 bg-gradient-to-r from-primary/10 to-secondary/10">
            <Video className="w-12 h-12 text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-bold mb-2">Watch Ad to Post</h3>
              <p className="text-sm text-muted-foreground">
                Watch a short ad to unlock meme posting
              </p>
            </div>
            <Button onClick={handleWatchAd} size="lg" className="w-full">
              <Video className="w-5 h-5 mr-2" />
              Watch Ad (3 seconds)
            </Button>
          </Card>
        )}

        {/* Post Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/meme.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={!adWatched}
                />
                <Button type="button" variant="outline" size="icon" disabled={!adWatched}>
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a direct link to your meme image
              </p>
            </div>

            {imageUrl && (
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => {
                    toast({
                      title: 'Invalid Image',
                      description: 'Could not load image from URL',
                      variant: 'destructive',
                    });
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                placeholder="Add a funny caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={!adWatched}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {caption.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={!adWatched}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {MEME_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!adWatched || uploading || !imageUrl || !caption || !category}
            >
              {uploading ? (
                'Posting...'
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Post Meme & Earn 13 Coins
                </>
              )}
            </Button>
          </Card>
        </form>
      </div>

      {/* Ad Dialog */}
      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Watching Ad...</DialogTitle>
            <DialogDescription>
              Please wait while the ad plays (3 seconds)
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
