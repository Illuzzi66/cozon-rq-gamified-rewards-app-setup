
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BannerAd } from '@/components/ads/BannerAd';
import { InterstitialAd } from '@/components/ads/InterstitialAd';
import { useAdTiming } from '@/hooks/useAdTiming';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Coins,
  Send,
  Sparkles,
  TrendingUp,
  Plus,
  Flag,
  MoreVertical
} from 'lucide-react';

interface Meme {
  id: string;
  image_url: string;
  caption: string;
  category: string;
  created_at: string;
  user_id: string;
}

interface MemeWithStats extends Meme {
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  author_username: string;
  author_avatar: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  username: string;
}

const MemeFeed: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { shouldShowCommentAd, resetCommentCount, incrementCommentCount } = useAdTiming();
  const [memes, setMemes] = useState<MemeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeme, setSelectedMeme] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [processingLike, setProcessingLike] = useState<string | null>(null);
  const [processingComment, setProcessingComment] = useState<string | null>(null);
  const [reportingMeme, setReportingMeme] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showCommentAd, setShowCommentAd] = useState(false);

  // Check if should show comment ad
  useEffect(() => {
    if (shouldShowCommentAd) {
      setShowCommentAd(true);
    }
  }, [shouldShowCommentAd]);

  useEffect(() => {
    fetchMemes();
  }, [profile]);

  const fetchMemes = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Fetch memes with author info
      const { data: memesData, error: memesError } = await supabase
        .from('memes')
        .select(`
          *,
          profiles!memes_user_id_fkey(username, avatar_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (memesError) throw memesError;

      // Fetch likes count and user likes
      const { data: likesData, error: likesError } = await supabase
        .from('meme_likes')
        .select('meme_id, user_id');

      if (likesError) throw likesError;

      // Fetch comments count
      const { data: commentsData, error: commentsError } = await supabase
        .from('meme_comments')
        .select('meme_id');

      if (commentsError) throw commentsError;

      // Combine data
      const memesWithStats: MemeWithStats[] = (memesData || []).map((meme: any) => ({
        id: meme.id,
        image_url: meme.image_url,
        caption: meme.caption,
        category: meme.category,
        created_at: meme.created_at,
        user_id: meme.user_id,
        likes_count: likesData?.filter((like) => like.meme_id === meme.id).length || 0,
        comments_count: commentsData?.filter((comment) => comment.meme_id === meme.id).length || 0,
        user_liked: likesData?.some((like) => like.meme_id === meme.id && like.user_id === profile.user_id) || false,
        author_username: meme.profiles?.username || 'Unknown',
        author_avatar: meme.profiles?.avatar_url || null,
      }));

      setMemes(memesWithStats);
    } catch (error) {
      console.error('Error fetching memes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load memes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (memeId: string) => {
    try {
      const { data, error } = await supabase
        .from('meme_comments')
        .select(`
          id,
          user_id,
          comment_text,
          created_at,
          profiles!inner(username)
        `)
        .eq('meme_id', memeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = (data || []).map((comment: any) => ({
        id: comment.id,
        user_id: comment.user_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        username: comment.profiles.username,
      }));

      setComments((prev) => ({ ...prev, [memeId]: formattedComments }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async (meme: MemeWithStats) => {
    if (!profile) return;
    
    // CRITICAL: Prevent duplicate submissions
    if (processingLike) {
      toast({
        title: 'Please Wait',
        description: 'Processing your previous action...',
        variant: 'default',
      });
      return;
    }

    setProcessingLike(meme.id);

    try {
      if (meme.user_liked) {
        // Unlike
        const { data, error } = await supabase.rpc('unlike_meme', {
          p_user_id: profile.user_id,
          p_meme_id: meme.id,
        });

        if (error) throw error;

        if (data.success) {
          setMemes((prev) =>
            prev.map((m) =>
              m.id === meme.id
                ? { ...m, user_liked: false, likes_count: m.likes_count - 1 }
                : m
            )
          );
          await refreshProfile();
        }
      } else {
        // Like
        const { data, error } = await supabase.rpc('like_meme', {
          p_user_id: profile.user_id,
          p_meme_id: meme.id,
        });

        if (error) throw error;

        if (data.success) {
          setMemes((prev) =>
            prev.map((m) =>
              m.id === meme.id
                ? { ...m, user_liked: true, likes_count: m.likes_count + 1 }
                : m
            )
          );
          
          toast({
            title: '❤️ Liked!',
            description: `You earned ${data.coins_earned} coins!`,
          });

          await refreshProfile();
        } else {
          toast({
            title: 'Already Liked',
            description: data.error,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error liking meme:', error);
      
      // Check if it's a duplicate error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Already liked')) {
        toast({
          title: 'Already Liked',
          description: 'You have already liked this meme.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to like meme',
          variant: 'destructive',
        });
      }
    } finally {
      setProcessingLike(null);
    }
  };

  const handleComment = async (memeId: string) => {
    if (!profile || !commentText[memeId]?.trim()) return;
    
    // CRITICAL: Prevent duplicate submissions
    if (processingComment) {
      toast({
        title: 'Please Wait',
        description: 'Processing your previous comment...',
        variant: 'default',
      });
      return;
    }

    setProcessingComment(memeId);

    try {
      const { data, error } = await supabase.rpc('comment_on_meme', {
        p_user_id: profile.user_id,
        p_meme_id: memeId,
        p_comment_text: commentText[memeId].trim(),
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '💬 Comment Posted!',
          description: `You earned ${data.coins_earned} coins!`,
        });

        setCommentText((prev) => ({ ...prev, [memeId]: '' }));
        setMemes((prev) =>
          prev.map((m) =>
            m.id === memeId ? { ...m, comments_count: m.comments_count + 1 } : m
          )
        );

        // Increment comment count for ad tracking
        await incrementCommentCount();

        await fetchComments(memeId);
        await refreshProfile();
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error commenting:', error);
      
      // Check if it's a duplicate error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Please wait before commenting')) {
        toast({
          title: 'Too Fast!',
          description: 'Please wait a moment before commenting again.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to post comment',
          variant: 'destructive',
        });
      }
    } finally {
      setProcessingComment(null);
    }
  };

  const toggleComments = (memeId: string) => {
    if (selectedMeme === memeId) {
      setSelectedMeme(null);
    } else {
      setSelectedMeme(memeId);
      if (!comments[memeId]) {
        fetchComments(memeId);
      }
    }
  };

  const handleReportMeme = async () => {
    if (!profile || !reportingMeme || !reportReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for reporting',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingReport(true);
    try {
      const { error } = await supabase.from('meme_reports').insert({
        meme_id: reportingMeme,
        reporter_user_id: profile.user_id,
        reason: reportReason.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe',
      });

      setReportingMeme(null);
      setReportReason('');
    } catch (error) {
      console.error('Error reporting meme:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Meme Feed</h1>
              <p className="text-sm text-muted-foreground">Like & comment to earn coins</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                if (profile.is_premium) {
                  navigate('/post-meme');
                } else {
                  toast({
                    title: 'Premium Required',
                    description: 'Upgrade to Premium to post memes and earn 5¢ per post!',
                    variant: 'destructive',
                  });
                  navigate('/premium');
                }
              }} 
              size="sm" 
              variant={profile.is_premium ? "default" : "outline"}
            >
              <Plus className="w-4 h-4 mr-1" />
              Post
            </Button>
            <div className="flex items-center gap-2 bg-gold/10 px-3 py-2 rounded-full">
              <Coins className="w-5 h-5 text-gold" />
              <span className="font-bold text-gold">{profile.coin_balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Earnings Info */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Like = 1 coin</p>
                <p className="text-xs text-muted-foreground">Tap the heart</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Comment = 2 coins</p>
                <p className="text-xs text-muted-foreground">Share your thoughts</p>
              </div>
            </div>
          </div>
          {profile.is_premium && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-premium">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Premium 2.5× bonus active!</span>
            </div>
          )}
        </Card>

        {/* Memes Feed */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading memes...</p>
          </div>
        ) : memes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No memes available yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {memes.map((meme) => (
              <Card key={meme.id} className="overflow-hidden">
                {/* Meme Image */}
                <div className="relative aspect-square bg-muted">
                  <img
                    src={meme.image_url}
                    alt={meme.caption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
                    {meme.category}
                  </div>
                </div>

                {/* Meme Content */}
                <div className="p-4 space-y-4">
                  {/* Author Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8 border-2 border-primary/20">
                        <AvatarImage src={meme.author_avatar || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                          {meme.author_username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">@{meme.author_username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(meme.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setReportingMeme(meme.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Report Meme
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Caption */}
                  <p className="text-sm">{meme.caption}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(meme)}
                      disabled={processingLike === meme.id}
                      className={meme.user_liked ? 'text-destructive' : ''}
                    >
                      <Heart
                        className={`w-5 h-5 mr-2 ${meme.user_liked ? 'fill-current' : ''}`}
                      />
                      {meme.likes_count}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(meme.id)}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {meme.comments_count}
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {selectedMeme === meme.id && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      {/* Comment Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={commentText[meme.id] || ''}
                          onChange={(e) =>
                            setCommentText((prev) => ({ ...prev, [meme.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleComment(meme.id);
                            }
                          }}
                          disabled={processingComment === meme.id}
                        />
                        <Button
                          size="icon"
                          onClick={() => handleComment(meme.id)}
                          disabled={
                            processingComment === meme.id || !commentText[meme.id]?.trim()
                          }
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {comments[meme.id]?.map((comment) => (
                          <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">@{comment.username}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{comment.comment_text}</p>
                          </div>
                        ))}
                        {comments[meme.id]?.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No comments yet. Be the first!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Premium Upsell */}
        {!profile.is_premium && (
          <Card className="p-6 bg-gradient-to-r from-premium/20 to-secondary/20 border-premium/30">
            <div className="text-center space-y-3">
              <TrendingUp className="w-12 h-12 text-premium mx-auto" />
              <h3 className="text-xl font-bold">Earn 2.5× More + Post Memes!</h3>
              <p className="text-muted-foreground">
                Upgrade to Premium to post memes (earn 5¢ per post) and multiply your earnings on every like and comment.
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>✨ Post unlimited memes</p>
                <p>💰 Earn 5¢ per meme post</p>
                <p>🚀 2.5× earnings on all activities</p>
              </div>
              <Button
                onClick={() => navigate('/premium')}
                size="lg"
                className="mt-2 bg-white text-black hover:bg-gray-100 border-2 border-black"
              >
                Go Premium Now
              </Button>
            </div>
          </Card>
        )}

        {/* Banner Ad */}
        <BannerAd className="my-4" />
      </div>

      {/* Comment Ad - Show after 5 comments */}
      <InterstitialAd
        isOpen={showCommentAd}
        onClose={async () => {
          setShowCommentAd(false);
          await resetCommentCount();
        }}
        onAdWatched={async () => {
          setShowCommentAd(false);
          await resetCommentCount();
        }}
      />

      {/* Report Meme Dialog */}
      <Dialog open={!!reportingMeme} onOpenChange={(open) => !open && setReportingMeme(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Meme</DialogTitle>
            <DialogDescription>
              Help us keep the community safe by reporting inappropriate content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for reporting</label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this meme..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportingMeme(null);
                setReportReason('');
              }}
              disabled={submittingReport}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReportMeme}
              disabled={submittingReport || !reportReason.trim()}
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemeFeed;