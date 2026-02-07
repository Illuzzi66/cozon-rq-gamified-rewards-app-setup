
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Coins,
  Send,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface Meme {
  id: string;
  image_url: string;
  caption: string;
  category: string;
  created_at: string;
}

interface MemeWithStats extends Meme {
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  username: string;
}

export const MemeFeed: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [memes, setMemes] = useState<MemeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeme, setSelectedMeme] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [processingLike, setProcessingLike] = useState<string | null>(null);
  const [processingComment, setProcessingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchMemes();
  }, [profile]);

  const fetchMemes = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Fetch memes
      const { data: memesData, error: memesError } = await supabase
        .from('memes')
        .select('*')
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
      const memesWithStats: MemeWithStats[] = (memesData || []).map((meme) => ({
        ...meme,
        likes_count: likesData?.filter((like) => like.meme_id === meme.id).length || 0,
        comments_count: commentsData?.filter((comment) => comment.meme_id === meme.id).length || 0,
        user_liked: likesData?.some((like) => like.meme_id === meme.id && like.user_id === profile.user_id) || false,
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
    if (!profile || processingLike) return;

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
      toast({
        title: 'Error',
        description: 'Failed to like meme',
        variant: 'destructive',
      });
    } finally {
      setProcessingLike(null);
    }
  };

  const handleComment = async (memeId: string) => {
    if (!profile || processingComment || !commentText[memeId]?.trim()) return;

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
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
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
          <div className="flex items-center gap-2 bg-gold/10 px-3 py-2 rounded-full">
            <Coins className="w-5 h-5 text-gold" />
            <span className="font-bold text-gold">{profile.coin_balance.toLocaleString()}</span>
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
              <h3 className="text-xl font-bold">Earn 2.5× More!</h3>
              <p className="text-muted-foreground">
                Upgrade to Premium and multiply your earnings on every like and comment.
              </p>
              <Button
                onClick={() => navigate('/premium')}
                variant="premium"
                size="lg"
                className="mt-2"
              >
                Go Premium - $2
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};