import React, { useCallback } from 'react';
import { FloatingContainer } from '@/cedar/components/structural/FloatingContainer';
import { ChatInput } from '@/cedar/components/chatInput/ChatInput';
import Container3D from '@/cedar/components/containers/Container3D';
import CaptionMessages from '@/cedar/components/chatMessages/CaptionMessages';

interface CedarCaptionChatProps {
  dimensions?: {
    width?: number;
    maxWidth?: number;
  };
  className?: string;
  showThinking?: boolean;
  stream?: boolean; // Whether to use streaming for responses
  initialInput?: string;
}

export const CedarCaptionChat: React.FC<CedarCaptionChatProps> = ({
  dimensions,
  className = '',
  showThinking = true,
  stream = true,
  initialInput,
}) => {
  return (
    <FloatingContainer
      isActive={true}
      position="bottom-center"
      dimensions={dimensions}
      resizable={false}
      className={`cedar-caption-container ${className}`}
    >
      <div className="text-sm">
        {/* Main Chat Container */}
        <Container3D
          className={`
            p-2 
            bg-card text-card-foreground 
            dark:bg-card dark:text-card-foreground 
            rounded-xl shadow-md transition-colors duration-300
          `}
        >
          <div className="w-full pb-3">
            <CaptionMessages showThinking={showThinking} />
          </div>

          <ChatInput className="bg-transparent p-0" stream={stream} initialValue={initialInput} />
        </Container3D>
      </div>
    </FloatingContainer>
  );
};
