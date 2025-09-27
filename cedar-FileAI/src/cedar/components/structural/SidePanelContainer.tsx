import { cn } from 'cedar-os';
import { motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface SidePanelDimensions {
	width?: number;
	minWidth?: number;
	maxWidth?: number;
}

interface SidePanelContainerProps {
	children?: React.ReactNode;
	panelContent?: React.ReactNode;
	isActive: boolean;
	side?: 'left' | 'right';
	className?: string;
	panelClassName?: string;
	dimensions?: SidePanelDimensions;
	resizable?: boolean;
	onResize?: (width: number) => void;
	topOffset?: number; // Top offset in pixels
}

export const SidePanelContainer: React.FC<SidePanelContainerProps> = ({
	children,
	panelContent,
	isActive,
	side = 'right',
	className = '',
	panelClassName = '',
	dimensions = {},
	resizable = true,
	onResize,
	topOffset = 0,
}) => {
	// Extract dimensions with defaults
	const { width: initialWidth = 600, minWidth = 300, maxWidth } = dimensions;

	const panelRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [panelWidth, setPanelWidth] = useState(initialWidth);
	const [dragStartX, setDragStartX] = useState(0);
	const [dragStartWidth, setDragStartWidth] = useState(0);
	const [isMobile, setIsMobile] = useState(false);

	// Calculate max width
	const calculatedMaxWidth =
		maxWidth || (typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800);

	// Detect mobile viewport
	useEffect(() => {
		const checkIsMobile = () => {
			setIsMobile(window.innerWidth <= 640);
		};
		checkIsMobile();
		window.addEventListener('resize', checkIsMobile);
		return () => window.removeEventListener('resize', checkIsMobile);
	}, []);

	// Drag handlers
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!resizable) return;
			e.preventDefault();
			setIsDragging(true);
			setDragStartX(e.clientX);
			setDragStartWidth(panelWidth);
		},
		[panelWidth, resizable]
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !resizable) return;

			const deltaX =
				side === 'right' ? dragStartX - e.clientX : e.clientX - dragStartX;
			const newWidth = Math.max(
				minWidth,
				Math.min(calculatedMaxWidth, dragStartWidth + deltaX)
			);
			setPanelWidth(newWidth);
			onResize?.(newWidth);
		},
		[
			isDragging,
			dragStartX,
			dragStartWidth,
			side,
			minWidth,
			calculatedMaxWidth,
			resizable,
			onResize,
		]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Global mouse event listeners for dragging
	useEffect(() => {
		if (isDragging && resizable) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
			document.body.style.webkitUserSelect = 'none';

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
				document.body.style.webkitUserSelect = '';
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp, resizable]);

	// Panel position and size for resize handle
	const [panelRect, setPanelRect] = useState<{ top: number; height: number }>({
		top: 0,
		height: 0,
	});

	useEffect(() => {
		if (isActive && panelRef.current) {
			const updateRect = () => {
				const rect = panelRef.current!.getBoundingClientRect();
				setPanelRect({ top: rect.top, height: rect.height });
			};
			updateRect();
			window.addEventListener('resize', updateRect);
			return () => window.removeEventListener('resize', updateRect);
		}
	}, [isActive]);

	const effectiveWidth = isMobile
		? '100vw'
		: Math.min(panelWidth, calculatedMaxWidth);

	return (
		<div className={cn('w-full', className)}>
			{/* Content area - adjusts padding when panel is open */}
			<div
				className='min-h-screen transition-all duration-300'
				style={{
					paddingLeft:
						!isMobile && isActive && side === 'left'
							? `${effectiveWidth}px`
							: '0',
					paddingRight:
						!isMobile && isActive && side === 'right'
							? `${effectiveWidth}px`
							: '0',
				}}>
				{children}
			</div>

			{/* Side panel */}
			{isActive && (
				<motion.div
					ref={panelRef}
					className={cn('fixed z-[60]', panelClassName)}
					style={{
						top: `${topOffset}px`,
						height: `calc(100vh - ${topOffset}px)`,
						width: effectiveWidth,
						maxWidth: isMobile ? '100vw' : `${calculatedMaxWidth}px`,
						minWidth: isMobile ? '100vw' : `${minWidth}px`,
						left: isMobile ? '0' : side === 'left' ? '0' : 'auto',
						right: isMobile ? '0' : side === 'right' ? '0' : 'auto',
					}}
					initial={{ x: side === 'left' ? '-100%' : '100%' }}
					animate={{ x: 0 }}
					exit={{ x: side === 'left' ? '-100%' : '100%' }}
					transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
					{panelContent}
				</motion.div>
			)}

			{/* Resize handle */}
			{isActive && !isMobile && resizable && (
				<div
					className='fixed w-1 bg-transparent hover:bg-blue-400/50 cursor-col-resize z-[9998]'
					style={{
						top: panelRect.top,
						height: panelRect.height,
						left: side === 'left' ? `${effectiveWidth}px` : 'auto',
						right: side === 'right' ? `${effectiveWidth}px` : 'auto',
						backgroundColor: isDragging ? '#60A5FA' : 'transparent',
					}}
					onMouseDown={handleMouseDown}>
					<div
						className='absolute inset-0 w-4 cursor-col-resize'
						style={{
							left: side === 'left' ? '-1.5rem' : '0',
							right: side === 'right' ? '-1.5rem' : '0',
						}}
					/>
				</div>
			)}
		</div>
	);
};
