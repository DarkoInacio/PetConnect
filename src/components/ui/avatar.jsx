import { cn } from '@/lib/utils';

function Avatar({ className, ...props }) {
	return (
		<div
			className={cn(
				'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
				className
			)}
			{...props}
		/>
	);
}

function AvatarImage({ className, alt = '', ...props }) {
	return (
		<img
			className={cn('aspect-square h-full w-full object-cover', className)}
			alt={alt}
			{...props}
		/>
	);
}

function AvatarFallback({ className, ...props }) {
	return (
		<div
			className={cn(
				'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
				className
			)}
			{...props}
		/>
	);
}

export { Avatar, AvatarImage, AvatarFallback };
