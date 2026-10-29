import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "@/src/components/markdown/renderer";
import { UserDropdown } from "@/src/components/nav";
import {
  useCreatePrivateMessageMutation,
  useMarkPrivateMessageReadMutation,
  usePrivateMessagesQuery,
  useUploadImageMutation,
} from "@/src/queries";
import { decodeUserParam } from "@/src/apis/utils";
import { cn } from "@/src/lib/utils";
import { Link, useParams } from "@/src/routing";
import { parseAccountInfo, useAuth } from "@/src/stores/auth";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { VirtualizerHandle, Virtualizer } from "virtua";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useProfileFromStore } from "@/src/stores/profiles";
import { PersonAvatar } from "@/src/components/person/person-avatar";
import TextareaAutosize from "react-textarea-autosize";
import { Send } from "@/src/components/icons";
import { LuImageUp } from "react-icons/lu";
import { Button } from "@/src/components/ui/button";
import { useIsActiveRoute, useMedia } from "@/src/hooks";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { PageTitle } from "@/src/components/page-title";
import { Schemas } from "@/src/apis/api-blueprint";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { useScrollToTopEvents } from "@/src/components/virtual-list";
import { getPreferedTimeFormat } from "@/src/lib/format";
import { Page } from "@/src/components/page";
import { ThemeComponent } from "@/src/components/theme-components";

const EMPTY_ARR: never[] = [];

dayjs.extend(localizedFormat);

export default function Messages() {
  const media = useMedia();

  const { mutateAsync: markMessageRead } = useMarkPrivateMessageReadMutation();
  const encodedOtherActorId = useParams("/messages/chat/:userId").userId;
  const otherActorId = decodeUserParam(encodedOtherActorId);

  const person = useProfileFromStore(otherActorId);
  const [signal, setSignal] = useState(0);
  const chat = usePrivateMessagesQuery({});

  const data = useMemo(() => {
    let prevDate: dayjs.Dayjs;

    return chat.data?.pages
      .flatMap((p) => p.privateMessages)
      .reverse()
      .filter(
        (pm) =>
          pm.recipientApId === otherActorId || pm.creatorApId === otherActorId,
      )
      .map((pm) => {
        const newDate = dayjs(pm.createdAt);

        let topOfDay = false;
        if (!newDate.isSame(prevDate, "date")) {
          topOfDay = true;
          prevDate = newDate;
        }
        prevDate ??= newDate;

        return {
          topOfDay,
          ...pm,
        };
      });
  }, [chat.data, otherActorId]);

  const account = useAuth((s) => s.getSelectedAccount());
  const { person: me } = parseAccountInfo(account);

  useEffect(() => {
    const fn = async () => {
      if (data && me) {
        for (const pm of data) {
          if (!pm.read && pm.creatorId !== me?.id) {
            await markMessageRead({
              id: pm.id,
              read: true,
            });
          }
        }
      }
    };
    fn();
  }, [data, me, markMessageRead]);

  const ref = useRef<VirtualizerHandle>(null);

  const scrollToBottom = useEffectEvent((smooth = true) => {
    const vList = ref.current;
    if (vList && data) {
      vList.scrollToIndex(data.length, { align: "end", smooth, offset: 100 });
    }
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToBottom(false);
    });
  }, [chat.isPending, signal]);

  const active = useIsActiveRoute();
  useScrollToTopEvents({
    scrollToTop: useCallback(() => {
      const vList = ref.current;
      if (vList) {
        vList.scrollToIndex(0, { align: "start", smooth: true });
      }
    }, []),
    focused: active,
  });

  return (
    <Page requireLogin>
      <PageTitle>{person ? person.handle : null}</PageTitle>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <Link to="/home/u/:userId" params={{ userId: encodedOtherActorId }}>
              <ToolbarTitle size="sm" numRightIcons={1}>
                {(person ? person.handle : null) ?? "Loading..."}
              </ToolbarTitle>
            </Link>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div className="h-full flex flex-col">
          <div
            className="flex-1 flex flex-col overflow-y-auto ion-content-scroll-host pt-5"
            style={{
              scrollbarGutter: media.xxl ? "stable" : undefined,
            }}
          >
            <Virtualizer
              key={signal}
              shift
              ref={ref}
              onScroll={() => {
                const vList = ref.current;
                if (vList) {
                  const startIndex = vList.findItemIndex(vList.scrollOffset);
                  if (
                    startIndex === 0 &&
                    !chat.isFetchingNextPage &&
                    chat.hasNextPage
                  ) {
                    chat.fetchNextPage();
                  }
                }
              }}
              data={data ?? EMPTY_ARR}
            >
              {(item) => {
                const isMe = item.creatorId === me?.id;
                return (
                  <ContentGutters key={item.id}>
                    <div className="flex-row pb-4 w-full">
                      {item.topOfDay && (
                        <span className="block pb-4 text-center text-xs text-muted-foreground">
                          {dayjs(item.createdAt).format("ll")}
                        </span>
                      )}
                      <div className="flex gap-2">
                        {!isMe && (
                          <Link
                            to="/home/u/:userId"
                            params={{ userId: encodedOtherActorId }}
                          >
                            <PersonAvatar
                              actorId={item.creatorApId}
                              size="sm"
                            />
                          </Link>
                        )}
                        <div
                          className={cn(
                            "flex flex-col p-2.5 rounded-lg max-w-2/3",
                            isMe
                              ? "bg-brand/10 dark:bg-brand/20 ml-auto"
                              : "rounded-tl-none bg-secondary",
                          )}
                        >
                          <MarkdownRenderer markdown={item.body} />
                          <span className="self-end text-xs text-secondary-foreground/50 mt-1">
                            {dayjs(item.createdAt).format(
                              getPreferedTimeFormat(),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </ContentGutters>
                );
              }}
            </Virtualizer>
            <div className="grow" />
          </div>
          {person && (
            <ComposeMessage
              recipient={person}
              onSubmit={() => {
                if (data) {
                  setSignal((s) => s + 1);
                }
              }}
            />
          )}
        </div>
      </IonContent>
    </Page>
  );
}

function ComposeMessage({
  recipient,
  onSubmit,
}: {
  recipient: Schemas.Person;
  onSubmit: () => void;
}) {
  const createPrivateMessage = useCreatePrivateMessageMutation(recipient);
  const uploadImage = useUploadImageMutation();
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insert `![](url)` at the cursor as its own paragraph, so it isn't laid
  // out inline next to the surrounding text
  const insertImage = (url: string) => {
    const el = textareaRef.current;
    const value = el?.value ?? body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // A blank line on each side, counting newlines already there
    const pad = (newlines: number) => "\n".repeat(Math.max(0, 2 - newlines));
    const image =
      (before ? pad(/\n*$/.exec(before)![0].length) : "") +
      `![](${url})` +
      (after ? pad(/^\n*/.exec(after)![0].length) : "");
    setBody(before + image + after);
    const caret = before.length + image.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const uploadImages = async (files: File[]) => {
    for (const file of files) {
      try {
        const { url } = await uploadImage.mutateAsync({ image: file });
        if (url) {
          insertImage(url);
        }
      } catch {
        // useUploadImageMutation already shows an error toast
      }
    }
  };

  return (
    <ContentGutters>
      <form
        data-theme-component={ThemeComponent.Button}
        className="my-1 flex items-center gap-2 border rounded-lg pl-1 pr-1 focus-within:ring"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim().length > 0 && !uploadImage.isPending) {
            createPrivateMessage.mutateAsync({
              body,
              recipientId: recipient.id,
            });
            onSubmit();
            setBody("");
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            // Allow picking the same file again
            e.target.value = "";
            uploadImages(files);
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6.5 w-6.5"
          aria-label="Upload image"
          disabled={uploadImage.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <LuImageUp />
        </Button>
        <TextareaAutosize
          ref={textareaRef}
          placeholder="Message"
          className="py-1 flex-1 outline-none resize-none min-h-8"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={(e) => {
            const images = Array.from(e.clipboardData.files).filter((file) =>
              file.type.startsWith("image/"),
            );
            if (images.length > 0) {
              e.preventDefault();
              uploadImages(images);
            }
          }}
          maxRows={6}
        />
        <Button
          size="icon"
          variant={body.length === 0 ? "ghost" : "default"}
          className="-rotate-90 h-6.5 w-6.5"
          disabled={uploadImage.isPending}
          aria-label="Send"
        >
          <Send />
        </Button>
      </form>
    </ContentGutters>
  );
}
