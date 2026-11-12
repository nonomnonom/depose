'use client';

import * as React from 'react';
import { cn } from 'cn';
import {
  ArrowUpIcon,
  FileIcon,
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react';

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '../ui/attachment';
import { Button } from '../ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '../ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Spinner } from '../ui/spinner';

export type PromptInputStatus = 'idle' | 'submitted' | 'streaming' | 'error';

export type PromptInputFile = {
  id: string;
  name: string;
  type: string;
  size?: number;
  url?: string;
};

export type PromptInputMessage = {
  text: string;
  files: PromptInputFile[];
};

type PromptInputController = {
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  files: PromptInputFile[];
  status: PromptInputStatus;
  addFiles: (files: File[] | FileList) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  openFilePicker: () => void;
  accept?: string;
  multiple?: boolean;
};

const PromptInputContext = React.createContext<PromptInputController | null>(null);

type ControllerOptions = {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  status?: PromptInputStatus;
  onError?: (error: { code: 'max_files' | 'max_file_size'; message: string }) => void;
};

function useControllerState(options: ControllerOptions): PromptInputController {
  const { accept, multiple, maxFiles = 10, maxFileSize, status = 'idle', onError } = options;
  const textRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = React.useState<PromptInputFile[]>([]);
  const errorRef = React.useRef(onError);
  errorRef.current = onError;

  const urlsRef = React.useRef<string[]>([]);
  React.useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const addFiles = React.useCallback(
    (incoming: File[] | FileList) => {
      const list = Array.from(incoming);
      if (list.length === 0) return;
      if (files.length + list.length > maxFiles) {
        errorRef.current?.({ code: 'max_files', message: `You can attach up to ${maxFiles} files.` });
        return;
      }
      if (maxFileSize && list.some((file) => file.size > maxFileSize)) {
        errorRef.current?.({
          code: 'max_file_size',
          message: `Files must be smaller than ${Math.round(maxFileSize / 1024 / 1024)} MB.`,
        });
        return;
      }
      const added = list.map((file) => {
        const isImage = file.type.startsWith('image/');
        const url = isImage ? URL.createObjectURL(file) : undefined;
        if (url) urlsRef.current.push(url);
        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          url,
        } satisfies PromptInputFile;
      });
      setFiles((current) => [...current, ...added]);
    },
    [files.length, maxFiles, maxFileSize],
  );

  const removeFile = React.useCallback((id: string) => {
    setFiles((current) => {
      const target = current.find((file) => file.id === id);
      if (target?.url) {
        URL.revokeObjectURL(target.url);
        urlsRef.current = urlsRef.current.filter((url) => url !== target.url);
      }
      return current.filter((file) => file.id !== id);
    });
  }, []);

  const clearFiles = React.useCallback(() => {
    setFiles((current) => {
      current.forEach((file) => {
        if (file.url) URL.revokeObjectURL(file.url);
      });
      return [];
    });
    urlsRef.current = [];
  }, []);

  return {
    textRef,
    fileInputRef,
    files,
    status,
    addFiles,
    removeFile,
    clearFiles,
    openFilePicker: () => fileInputRef.current?.click(),
    accept,
    multiple,
  };
}

export function usePromptInputController(): PromptInputController {
  const value = React.useContext(PromptInputContext);
  if (!value) throw new Error('Prompt input parts must be rendered inside <PromptInput>.');
  return value;
}

export function usePromptInputAttachments() {
  const controller = usePromptInputController();
  return {
    files: controller.files,
    add: controller.addFiles,
    remove: controller.removeFile,
    clear: controller.clearFiles,
    openFilePicker: controller.openFilePicker,
  };
}

/** Optional provider so siblings outside the form can read attachments. */
function PromptInputProvider({
  children,
  ...options
}: ControllerOptions & { children?: React.ReactNode }) {
  const controller = useControllerState(options);
  return <PromptInputContext.Provider value={controller}>{children}</PromptInputContext.Provider>;
}

type PromptInputProps = Omit<React.ComponentProps<'form'>, 'onSubmit' | 'onError'> &
  ControllerOptions & {
    onSubmit?: (message: PromptInputMessage, event: React.FormEvent<HTMLFormElement>) => void;
    globalDrop?: boolean;
    inputGroupClassName?: string;
  };

/** A message field with attachments and a send button. */
function PromptInput({
  className,
  inputGroupClassName,
  children,
  onSubmit,
  accept,
  multiple = true,
  maxFiles,
  maxFileSize,
  onError,
  status = 'idle',
  globalDrop = false,
  ...props
}: PromptInputProps) {
  const external = React.useContext(PromptInputContext);
  const local = useControllerState({
    accept,
    multiple,
    maxFiles,
    maxFileSize,
    onError,
    status,
  });
  const controller = external ?? local;

  React.useEffect(() => {
    if (!globalDrop) return;
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files?.length) return;
      event.preventDefault();
      controller.addFiles(event.dataTransfer.files);
    };
    const onDragOver = (event: DragEvent) => event.preventDefault();
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', onDragOver);
    return () => {
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragover', onDragOver);
    };
  }, [globalDrop, controller]);

  return (
    <PromptInputContext.Provider value={controller}>
      <form
        data-slot="prompt-input"
        className={cn('w-full', className)}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.(
            {
              text: controller.textRef.current?.value ?? '',
              files: controller.files,
            },
            event,
          );
        }}
        {...props}
      >
        <input
          ref={controller.fileInputRef}
          type="file"
          hidden
          accept={controller.accept}
          multiple={controller.multiple}
          onChange={(event) => {
            if (event.target.files) controller.addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <InputGroup
          className={cn(
            'h-auto min-h-14 flex-col items-stretch gap-0 rounded-xl p-0',
            inputGroupClassName,
          )}
        >
          {children}
        </InputGroup>
      </form>
    </PromptInputContext.Provider>
  );
}

function PromptInputTextarea({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<typeof InputGroupTextarea>) {
  const { textRef, status } = usePromptInputController();
  return (
    <InputGroupTextarea
      ref={textRef}
      data-slot="prompt-input-textarea"
      rows={2}
      disabled={status === 'submitted'}
      className={cn('max-h-40 min-h-14 p-3', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }}
      {...props}
    />
  );
}

function PromptInputHeader({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { files } = usePromptInputController();
  if (files.length === 0 && !children) return null;
  return (
    <div
      data-slot="prompt-input-header"
      className={cn('flex min-w-0 flex-col px-2 pt-2', className)}
      {...props}
    >
      {children ?? <PromptInputAttachments />}
    </div>
  );
}

function PromptInputAttachments({ className, ...props }: React.ComponentProps<'div'>) {
  const { files } = usePromptInputController();
  if (files.length === 0) return null;
  return (
    <AttachmentGroup className={className} data-slot="prompt-input-attachments" {...props}>
      {files.map((file) => (
        <PromptInputAttachment key={file.id} file={file} />
      ))}
    </AttachmentGroup>
  );
}

function PromptInputAttachment({
  className,
  file,
}: {
  className?: string;
  file: PromptInputFile;
}) {
  const { removeFile } = usePromptInputController();
  const isImage = Boolean(file.url);
  return (
    <Attachment size="sm" className={className} data-slot="prompt-input-attachment">
      <AttachmentMedia variant={isImage ? 'image' : 'icon'}>
        {isImage ? (
          <img src={file.url} alt={file.name} />
        ) : file.type.startsWith('image/') ? (
          <ImageIcon />
        ) : (
          <FileIcon />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{file.name}</AttachmentTitle>
        {file.size !== undefined ? (
          <AttachmentDescription>{Math.ceil(file.size / 1024)} KB</AttachmentDescription>
        ) : null}
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction
          aria-label={`Remove ${file.name}`}
          onClick={() => removeFile(file.id)}
        >
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

function PromptInputBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="prompt-input-body" className={cn('min-w-0', className)} {...props} />
  );
}

function PromptInputFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="prompt-input-footer"
      className={cn('flex items-center gap-1 px-2 pb-2', className)}
      {...props}
    />
  );
}

function PromptInputTools({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="prompt-input-tools" className={cn('flex items-center gap-1', className)} {...props} />
  );
}

function PromptInputButton({ className, ...props }: React.ComponentProps<typeof InputGroupButton>) {
  return (
    <InputGroupButton
      size="icon-sm"
      variant="ghost"
      className={cn('rounded-full', className)}
      {...props}
    />
  );
}

function PromptInputActionMenu({ ...props }: React.ComponentProps<typeof Popover>) {
  return <Popover {...props} />;
}

function PromptInputActionMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PopoverTrigger>) {
  return (
    <PopoverTrigger
      render={
        <InputGroupButton
          size="icon-sm"
          variant="outline"
          className={cn('rounded-full', className)}
          aria-label="Add to prompt"
        />
      }
      {...props}
    >
      {children ?? <PlusIcon />}
    </PopoverTrigger>
  );
}

function PromptInputActionMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      align="start"
      className={cn('flex w-52 flex-col gap-0.5 p-1.5', className)}
      {...props}
    />
  );
}

function PromptInputActionMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('w-full justify-start', className)}
      {...props}
    />
  );
}

function PromptInputActionAddAttachments({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { openFilePicker } = usePromptInputController();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('w-full justify-start', className)}
      onClick={openFilePicker}
      {...props}
    >
      <PaperclipIcon />
      {children ?? 'Attach files'}
    </Button>
  );
}

function PromptInputSubmit({
  className,
  status,
  disabled,
  onStop,
  children,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupButton>, 'children' | 'type'> & {
  status?: PromptInputStatus;
  onStop?: () => void;
  children?: React.ReactNode;
}) {
  const controller = usePromptInputController();
  const resolvedStatus = status ?? controller.status;
  const streaming = resolvedStatus === 'streaming';
  return (
    <InputGroupButton
      data-slot="prompt-input-submit"
      type={streaming ? 'button' : 'submit'}
      size="icon-sm"
      variant="default"
      disabled={disabled ?? (!streaming && resolvedStatus === 'submitted')}
      aria-label={streaming ? 'Stop' : 'Send message'}
      className={cn('rounded-full', className)}
      onClick={streaming ? onStop : undefined}
      {...props}
    >
      {children ??
        (streaming ? (
          <SquareIcon />
        ) : resolvedStatus === 'submitted' ? (
          <Spinner />
        ) : (
          <ArrowUpIcon />
        ))}
    </InputGroupButton>
  );
}

type SelectValue = { value?: string; onValueChange?: (value: string) => void; open: boolean; setOpen: (open: boolean) => void };
const SelectContext = React.createContext<SelectValue>({ open: false, setOpen: () => {} });

function PromptInputSelect({
  children,
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Popover>, 'children'> & {
  children?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <Popover open={open} onOpenChange={setOpen} {...props}>
        {children}
      </Popover>
    </SelectContext.Provider>
  );
}

function PromptInputSelectTrigger({
  className,
  ...props
}: Omit<React.ComponentProps<typeof PopoverTrigger>, 'className'> & { className?: string }) {
  return (
    <PopoverTrigger
      render={<InputGroupButton size="sm" variant="ghost" className={className} />}
      {...props}
    />
  );
}

function PromptInputSelectValue({ className, ...props }: React.ComponentProps<'span'>) {
  const { value } = React.useContext(SelectContext);
  return (
    <span data-slot="prompt-input-select-value" className={cn('truncate', className)} {...props}>
      {value}
    </span>
  );
}

function PromptInputSelectContent({
  className,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      align="start"
      className={cn('flex w-48 flex-col gap-0.5 p-1.5', className)}
      {...props}
    />
  );
}

function PromptInputSelectItem({
  className,
  value,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & {
  value: string;
  children?: React.ReactNode;
}) {
  const select = React.useContext(SelectContext);
  return (
    <Button
      variant={select.value === value ? 'secondary' : 'ghost'}
      size="sm"
      className={cn('w-full justify-start', className)}
      onClick={() => {
        select.onValueChange?.(value);
        select.setOpen(false);
      }}
      {...props}
    >
      {children ?? value}
    </Button>
  );
}

function PromptInputHoverCard({ ...props }: React.ComponentProps<typeof HoverCard>) {
  return <HoverCard {...props} />;
}

function PromptInputHoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardTrigger>) {
  return <HoverCardTrigger delay={100} closeDelay={100} {...props} />;
}

function PromptInputHoverCardContent({
  className,
  ...props
}: React.ComponentProps<typeof HoverCardContent>) {
  return <HoverCardContent className={cn('w-64 text-xs', className)} {...props} />;
}

function PromptInputActionLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="prompt-input-action-label"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function PromptInputAddon({ className, ...props }: React.ComponentProps<typeof InputGroupAddon>) {
  return (
    <InputGroupAddon
      align="block-end"
      className={cn('border-t border-border px-1.5 py-1.5', className)}
      {...props}
    />
  );
}

export {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
  PromptInputActionLabel,
  PromptInputSubmit,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputHoverCard,
  PromptInputHoverCardTrigger,
  PromptInputHoverCardContent,
  PromptInputAddon,
};
