import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface PageFeedbackProps {
  pageId: string;
  settings: DesignSettings;
}

const PageFeedback = ({ pageId, settings: s }: PageFeedbackProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedHelpful, setSelectedHelpful] = useState<boolean | null>(null);

  // Reset state when page changes
  useEffect(() => {
    setSubmitted(false);
    setShowComment(false);
    setComment("");
    setSelectedHelpful(null);
  }, [pageId]);

  const submitFeedback = async (isHelpful: boolean, feedbackComment?: string) => {
    setSelectedHelpful(isHelpful);
    await supabase.from("page_feedback").insert({
      page_id: pageId,
      is_helpful: isHelpful,
      comment: feedbackComment || null,
    });
    setSubmitted(true);
  };

  const handleVote = (isHelpful: boolean) => {
    if (isHelpful) {
      submitFeedback(true);
    } else {
      setSelectedHelpful(false);
      setShowComment(true);
    }
  };

  const handleCommentSubmit = () => {
    submitFeedback(false, comment);
  };

  if (submitted) {
    return (
      <div
        className="flex items-center gap-2 py-6 mt-8 border-t"
        style={{ borderColor: `hsl(${s.borderColor})`, color: `hsl(${s.mutedForegroundColor})`, fontSize: `${s.baseFontSize - 1}px` }}
      >
        <Check className="h-4 w-4" style={{ color: `hsl(${s.primaryColor})` }} />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="py-6 mt-8 border-t" style={{ borderColor: `hsl(${s.borderColor})` }}>
      <div className="flex items-center gap-3" style={{ fontFamily: `'${s.bodyFont}', sans-serif` }}>
        <span style={{ fontSize: `${s.baseFontSize - 1}px`, color: `hsl(${s.mutedForegroundColor})` }}>
          Was this page helpful?
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleVote(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors hover:bg-accent"
            style={{
              borderColor: `hsl(${s.borderColor})`,
              fontSize: `${s.baseFontSize - 2}px`,
              color: `hsl(${s.mutedForegroundColor})`,
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Yes
          </button>
          <button
            onClick={() => handleVote(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors hover:bg-accent"
            style={{
              borderColor: `hsl(${s.borderColor})`,
              fontSize: `${s.baseFontSize - 2}px`,
              color: `hsl(${s.mutedForegroundColor})`,
            }}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> No
          </button>
        </div>
      </div>
      {showComment && (
        <div className="mt-3 flex gap-2 max-w-md animate-fade-in">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved?"
            className="flex-1 px-3 py-1.5 text-sm rounded-md border bg-transparent outline-none focus:ring-1 focus:ring-ring"
            style={{ borderColor: `hsl(${s.borderColor})`, fontSize: `${s.baseFontSize - 2}px` }}
            onKeyDown={(e) => { if (e.key === "Enter") handleCommentSubmit(); }}
          />
          <button
            onClick={handleCommentSubmit}
            className="px-3 py-1.5 rounded-md text-sm font-medium"
            style={{
              backgroundColor: `hsl(${s.primaryColor})`,
              color: `hsl(${s.primaryForegroundColor})`,
              fontSize: `${s.baseFontSize - 2}px`,
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default PageFeedback;
