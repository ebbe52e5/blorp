import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import { IonContent, IonHeader, IonToolbar, useIonAlert } from "@ionic/react";
import { FiHelpCircle } from "react-icons/fi";
import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "@/src/routing";
import {
  type Account,
  getAccountSite,
  parseAccountInfo,
  useAuth,
} from "@/src/stores/auth";
import { Page } from "../../components/page";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { useState } from "react";
import { MarkdownEditor } from "@/src/components/markdown/editor";
import {
  useChangePasswordMutation,
  useRemoveUserAvatarMutation,
  useUpdateUserSettingsMutation,
} from "@/src/queries";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { useHistory } from "react-router";
import { useDropzone } from "react-dropzone";
import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { isCapacitor, isIos } from "@/src/lib/device";
import { useSettingsStore } from "@/src/stores/settings";
import { SimpleSelect } from "@/src/components/ui/simple-select";
import { type ScoreDisplay } from "@/src/stores/utils";
import { parseHandle } from "@/src/lib/handle";
import { DISPLAY_NAME_MAX_LENGTH } from "@/src/features/create-community/shared";

const VOTE_DISPLAY_OPTIONS: { value: ScoreDisplay; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "upvotes", label: "Upvotes only" },
  { value: "downvotes", label: "Downvotes only" },
  { value: "none", label: "Hidden" },
];

const SHOW_HIDE_OPTIONS: { value: "show" | "hide"; label: string }[] = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
];

const SCROLL_STYLE_OPTIONS: { value: "infinite" | "pages"; label: string }[] = [
  { value: "infinite", label: "Infinite scroll" },
  { value: "pages", label: "Manual pages" },
];

// Lemmy's interface_language values. The backend also picks the language of
// its emails from it; "browser" isn't a language, so those emails fall back
// to English.
const ACCOUNT_LANGUAGE_OPTIONS = [
  { value: "browser", label: "Browser default" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

function languageLabel(code: string) {
  return ACCOUNT_LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

function pruneKeywords(keywords: string[]) {
  return _.uniq(keywords.map((k) => k.trim()).filter(Boolean));
}

/**
 * An account setting, or a note that the device setting overrides it
 */
function AccountSettingRow({
  label,
  overridden,
  onUseAccount,
  onInfo,
  children,
}: {
  label: string;
  overridden: boolean;
  onUseAccount: () => void;
  onInfo: () => void;
  children: React.ReactNode;
}) {
  if (!overridden) {
    return (
      <div className="flex items-center justify-between gap-2">
        <label className="font-light">{label}</label>
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-light">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onUseAccount}
        >
          Use account setting
        </Button>
        <Button variant="secondary" size="icon" type="button" onClick={onInfo}>
          <FiHelpCircle />
        </Button>
      </div>
    </div>
  );
}

type NsfwDisplay = "hidden" | "blur" | "show";

const NSFW_DISPLAY_OPTIONS: { value: NsfwDisplay; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "blur", label: "Blur" },
  { value: "show", label: "Show" },
];

function toNsfwDisplay(showNsfw: boolean, blurNsfw: boolean): NsfwDisplay {
  if (!showNsfw) {
    return "hidden";
  }
  return blurNsfw ? "blur" : "show";
}

function fromNsfwDisplay(mode: NsfwDisplay): {
  showNsfw: boolean;
  blurNsfw: boolean;
} {
  switch (mode) {
    case "hidden":
      return { showNsfw: false, blurNsfw: true };
    case "blur":
      return { showNsfw: true, blurNsfw: true };
    case "show":
      return { showNsfw: true, blurNsfw: false };
  }
}

// Note: this conversion is intentionally lossy. Lemmy has three separate
// boolean fields (showUpvotes, showDownvotes, showScores) but the UI collapses
// them into a single mode. For example, showUpvotes=true+showDownvotes=true is
// treated the same as showScores=true ("score" mode). Saving any mode other
// than the original combination will normalise those fields on the server, which
// is acceptable because the visible behaviour is identical.
function toScoreDisplay(
  showUpvotes: boolean,
  showDownvotes: boolean,
  showScores: boolean,
): ScoreDisplay {
  if (showUpvotes && showDownvotes) {
    return "score";
  }
  if (showUpvotes) {
    return "upvotes";
  }
  if (showDownvotes) {
    return "downvotes";
  }
  if (showScores) {
    return "score";
  }
  return "none";
}

function fromScoreDisplay(mode: ScoreDisplay): {
  showUpvotes: boolean;
  showDownvotes: boolean;
  showScores: boolean;
} {
  switch (mode) {
    case "score":
      return { showUpvotes: false, showDownvotes: false, showScores: true };
    case "upvotes":
      return { showUpvotes: true, showDownvotes: false, showScores: false };
    case "downvotes":
      return { showUpvotes: false, showDownvotes: true, showScores: false };
    case "none":
      return { showUpvotes: false, showDownvotes: false, showScores: false };
  }
}

function ChangePasswordForm({ account }: { account: Account }) {
  const changePassword = useChangePasswordMutation();
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordVerify, setNewPasswordVerify] = useState("");
  const [oldPassword, setOldPassword] = useState("");

  const handleSubmit = () => {
    if (newPassword !== newPasswordVerify) {
      toast.error("Passwords do not match");
      return;
    }
    changePassword
      .mutateAsync({
        account,
        form: { newPassword, newPasswordVerify, oldPassword },
      })
      .then(() => {
        setNewPassword("");
        setNewPasswordVerify("");
        setOldPassword("");
      });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="gap-4 flex flex-col"
    >
      <h2 className="font-bold">Change password</h2>
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm" htmlFor="new-password">
          New password
        </label>
        <Input
          type="password"
          id="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          className="text-muted-foreground text-sm"
          htmlFor="verify-new-password"
        >
          Verify new password
        </label>
        <Input
          type="password"
          id="verify-new-password"
          value={newPasswordVerify}
          onChange={(e) => setNewPasswordVerify(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm" htmlFor="old-password">
          Current password
        </label>
        {/* Left optional: Lemmy accepts an empty old password for accounts
            created through OAuth, which have none */}
        <Input
          type="password"
          id="old-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <Button
        variant="outline"
        disabled={
          changePassword.isPending || !newPassword || !newPasswordVerify
        }
      >
        Change password
      </Button>
    </form>
  );
}

function FileUpload({
  placeholder,
  onDrop,
  imgClassName,
}: {
  placeholder?: string | null;
  onDrop: (file: File) => void;
  imgClassName?: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    onDrop: (files) => {
      if (files[0]) {
        onDrop(files[0]);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed min-h-32 rounded-md p-2 flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
    >
      <input id="profile-upload" {...getInputProps()} />
      {placeholder && (
        <img
          src={placeholder}
          className={cn("aspect-square object-cover", imgClassName)}
        />
      )}
      {isDragActive ? (
        <p className="">Drop the files here ...</p>
      ) : (
        <p className="text-muted-foreground">
          Drop or upload image here
          {placeholder && " to replace"}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { index: indexStr } = useParams("/settings/update-profile/:index");
  const index = parseInt(indexStr);

  const account = useAuth((s) => s.accounts[index]);
  const site = account ? getAccountSite(account) : null;

  const [_email, setEmail] = useState<string>();
  const email = _email ?? site?.myEmail ?? "";

  const [_displayName, setDisplayName] = useState<string>();
  const displayName = _displayName ?? site?.me?.displayName ?? "";

  const [_bio, setBio] = useState<string>();
  const bio = _bio ?? site?.me?.bio ?? "";

  const [_nsfwDisplay, setNsfwDisplay] = useState<NsfwDisplay>();
  const nsfwDisplay =
    _nsfwDisplay ??
    toNsfwDisplay(site?.showNsfw ?? false, site?.blurNsfw ?? true);
  const { showNsfw, blurNsfw } = fromNsfwDisplay(nsfwDisplay);

  const serverEnablesDownvotes =
    site?.enablePostDownvotes !== false ||
    site?.enableCommentDownvotes !== false;

  const [_voteDisplay, setVoteDisplay] = useState<ScoreDisplay>();
  const voteDisplay =
    _voteDisplay ??
    toScoreDisplay(
      site?.showUpvotes ?? true,
      (site?.showDownvotes ?? true) && serverEnablesDownvotes,
      site?.showScores ?? true,
    );
  const { showUpvotes, showDownvotes, showScores } =
    fromScoreDisplay(voteDisplay);

  const [_replyCollapseThreshold, setReplyCollapseThreshold] =
    useState<number>();
  const replyCollapseThreshold =
    _replyCollapseThreshold ?? site?.replyCollapseThreshold ?? -10;

  const [_replyHideThreshold, setReplyHideThreshold] = useState<number>();
  const replyHideThreshold =
    _replyHideThreshold ?? site?.replyHideThreshold ?? -20;

  const [_showReadPosts, setShowReadPosts] = useState<boolean>();
  const showReadPosts = _showReadPosts ?? site?.showReadPosts;

  const [_showBotAccounts, setShowBotAccounts] = useState<boolean>();
  const showBotAccounts = _showBotAccounts ?? site?.showBotAccounts;

  const [_infiniteScrollEnabled, setInfiniteScrollEnabled] =
    useState<boolean>();
  const infiniteScrollEnabled =
    _infiniteScrollEnabled ?? site?.infiniteScrollEnabled;

  const [_interfaceLanguage, setInterfaceLanguage] = useState<string>();
  const interfaceLanguage = _interfaceLanguage ?? site?.interfaceLanguage;

  const [_blockingKeywords, setBlockingKeywords] = useState<string[]>();
  const blockingKeywords = _blockingKeywords ?? site?.blockingKeywords;

  const hideReadSetting = useSettingsStore((s) => s.hideReadSetting);
  const setHideReadSetting = useSettingsStore((s) => s.setHideReadSetting);
  const paginationSetting = useSettingsStore((s) => s.paginationSetting);
  const setPaginationSetting = useSettingsStore((s) => s.setPaginationSetting);

  const nsfwPreviouslyEnabled = useSettingsStore(
    (s) => s.nsfwPreviouslyEnabled,
  );
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const setVoteDisplaySetting = useSettingsStore(
    (s) => s.setVoteDisplaySetting,
  );
  const collapseThresholdSetting = useSettingsStore(
    (s) => s.collapseThresholdSetting,
  );
  const setCollapseThresholdSetting = useSettingsStore(
    (s) => s.setCollapseThresholdSetting,
  );
  const hideThresholdSetting = useSettingsStore((s) => s.hideThresholdSetting);
  const setHideThresholdSetting = useSettingsStore(
    (s) => s.setHideThresholdSetting,
  );

  const isPieFed = site?.software === "piefed";

  const [presentAlert] = useIonAlert();
  const showOverrideInfo = () =>
    presentAlert({
      header: "Blorp is overriding this setting",
      message: `Your Blorp app settings are overriding this account preference. Tap "Use account setting" to let your ${_.capitalize(site?.software)} account preference take effect.`,
      buttons: [{ text: "OK", role: "cancel" }],
    });
  const canShowNsfwSetting =
    !(isCapacitor() && isIos()) || nsfwPreviouslyEnabled;

  const updateUserSettings = useUpdateUserSettingsMutation();
  const removeUserAvatar = useRemoveUserAvatarMutation();
  const history = useHistory();

  const { person } = account
    ? parseAccountInfo(account)
    : { person: undefined };
  const handle = person?.handle;
  const isLemmy = site?.software === "lemmy";

  const handleSubmit = () => {
    if (account) {
      updateUserSettings
        .mutateAsync({
          account,
          form: {
            // Only sent once changed, so an untouched field can't fail
            // validation of a name another app set
            displayName: _displayName?.trim(),
            bio,
            email,
            showNsfw,
            blurNsfw,
            showUpvotes,
            showDownvotes,
            showScores,
            replyCollapseThreshold,
            replyHideThreshold,
            // Only sent once changed, so saving the profile keeps what other
            // apps set, e.g. lemmy-ui's "browser" language
            showReadPosts: _showReadPosts,
            showBotAccounts: _showBotAccounts,
            infiniteScrollEnabled: _infiniteScrollEnabled,
            interfaceLanguage: _interfaceLanguage,
            blockingKeywords:
              _blockingKeywords && pruneKeywords(_blockingKeywords),
          },
        })
        .then(() => history.goBack());
    }
  };

  return (
    <Page notFound={!account}>
      <PageTitle>{handle ?? "Person"}</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              {handle ?? "Person"}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="py-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-muted-foreground text-sm">
                Avatar (auto saves)
              </label>
              <FileUpload
                placeholder={person?.avatar}
                onDrop={(file) => {
                  if (account) {
                    updateUserSettings.mutate({
                      account,
                      form: {
                        avatar: file,
                      },
                    });
                  }
                }}
                imgClassName="w-24 h-24 rounded-full"
              />
              {person?.avatar && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (account) {
                      removeUserAvatar.mutate(account);
                    }
                  }}
                >
                  Remove avatar
                </Button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="gap-4 flex flex-col"
              data-testid="signup-form"
            >
              <div className="flex flex-col gap-1">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="username"
                >
                  Username
                </label>
                <Input id="username" value={handle ?? ""} disabled readOnly />
                <span className="text-muted-foreground text-xs">
                  Your unique username. It can't be changed.
                </span>
              </div>

              {!isPieFed && (
                <div className="flex flex-col gap-1">
                  <label
                    className="text-muted-foreground text-sm"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <Input
                    placeholder="Email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              {/* PieFed's settings API can't change the display name */}
              {!isPieFed && (
                <div className="flex flex-col gap-1">
                  <label
                    className="text-muted-foreground text-sm"
                    htmlFor="display-name"
                  >
                    Display name
                  </label>
                  <Input
                    placeholder={person ? parseHandle(person.handle).name : ""}
                    id="display-name"
                    value={displayName}
                    maxLength={DISPLAY_NAME_MAX_LENGTH}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <span className="text-muted-foreground text-xs">
                    Shown instead of your username. Leave empty to show your
                    username.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-sm" htmlFor="bio">
                  Bio
                </label>
                <MarkdownEditor
                  className="border rounded-md min-h-32"
                  placeholder="Bio"
                  id="bio"
                  content={bio}
                  onChange={(md) => setBio(md)}
                />
              </div>

              {canShowNsfwSetting && (
                <div className="flex items-center justify-between gap-2">
                  <label className="font-light">NSFW content</label>
                  <SimpleSelect
                    options={NSFW_DISPLAY_OPTIONS}
                    value={nsfwDisplay}
                    onChange={(opt) => setNsfwDisplay(opt.value)}
                    valueGetter={(o) => o.value}
                    labelGetter={(o) => o.label}
                    className="w-[160px]"
                    side="top"
                  />
                </div>
              )}

              {isLemmy && (
                <>
                  {voteDisplaySetting === "account" ? (
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-light">Vote display</label>
                      <SimpleSelect
                        options={
                          serverEnablesDownvotes
                            ? VOTE_DISPLAY_OPTIONS
                            : VOTE_DISPLAY_OPTIONS.filter(
                                (o) => o.value !== "downvotes",
                              )
                        }
                        value={voteDisplay}
                        onChange={(opt) => setVoteDisplay(opt.value)}
                        valueGetter={(o) => o.value}
                        labelGetter={(o) => o.label}
                        className="w-[160px]"
                        side="top"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Vote display</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setVoteDisplaySetting("account")}
                        >
                          Use account setting
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          type="button"
                          onClick={showOverrideInfo}
                        >
                          <FiHelpCircle />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isPieFed && (
                <>
                  {collapseThresholdSetting === "account" ? (
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-light">Collapse comments</label>
                      <SimpleSelect
                        options={_.sortBy(
                          _.uniq([-5, -10, -15, -20, replyCollapseThreshold]),
                          (o) => -o,
                        )}
                        value={replyCollapseThreshold}
                        onChange={setReplyCollapseThreshold}
                        valueGetter={(o) => o}
                        labelGetter={(o) => `Score \u2264 ${o}`}
                        className="w-[160px]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Collapse comments</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setCollapseThresholdSetting("account")}
                        >
                          Use account setting
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          type="button"
                          onClick={showOverrideInfo}
                        >
                          <FiHelpCircle />
                        </Button>
                      </div>
                    </div>
                  )}
                  {hideThresholdSetting === "account" ? (
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-light">Hide comments</label>
                      <SimpleSelect
                        options={_.sortBy(
                          _.uniq([-5, -10, -15, -20, replyHideThreshold]),
                          (o) => -o,
                        )}
                        value={replyHideThreshold}
                        onChange={setReplyHideThreshold}
                        valueGetter={(o) => o}
                        labelGetter={(o) => `Score \u2264 ${o}`}
                        className="w-[160px]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Hide comments</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setHideThresholdSetting("account")}
                        >
                          Use account setting
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          type="button"
                          onClick={showOverrideInfo}
                        >
                          <FiHelpCircle />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!_.isUndefined(showReadPosts) && (
                <AccountSettingRow
                  label="Read posts in feeds"
                  overridden={hideReadSetting !== "account"}
                  onUseAccount={() => setHideReadSetting("account")}
                  onInfo={showOverrideInfo}
                >
                  <SimpleSelect
                    options={SHOW_HIDE_OPTIONS}
                    value={showReadPosts ? "show" : "hide"}
                    onChange={(opt) => setShowReadPosts(opt.value === "show")}
                    valueGetter={(o) => o.value}
                    labelGetter={(o) => o.label}
                    className="w-[160px]"
                    side="top"
                  />
                </AccountSettingRow>
              )}

              {/* The server filters bot posts, so the device setting can only
                  hide more of them, never show them */}
              {!_.isUndefined(showBotAccounts) && (
                <div className="flex items-center justify-between gap-2">
                  <label className="font-light">Bot posts</label>
                  <SimpleSelect
                    options={SHOW_HIDE_OPTIONS}
                    value={showBotAccounts ? "show" : "hide"}
                    onChange={(opt) => setShowBotAccounts(opt.value === "show")}
                    valueGetter={(o) => o.value}
                    labelGetter={(o) => o.label}
                    className="w-[160px]"
                    side="top"
                  />
                </div>
              )}

              {!_.isUndefined(infiniteScrollEnabled) && (
                <AccountSettingRow
                  label="Scroll style"
                  overridden={paginationSetting !== "account"}
                  onUseAccount={() => setPaginationSetting("account")}
                  onInfo={showOverrideInfo}
                >
                  <SimpleSelect
                    options={SCROLL_STYLE_OPTIONS}
                    value={infiniteScrollEnabled ? "infinite" : "pages"}
                    onChange={(opt) =>
                      setInfiniteScrollEnabled(opt.value === "infinite")
                    }
                    valueGetter={(o) => o.value}
                    labelGetter={(o) => o.label}
                    className="w-[160px]"
                    side="top"
                  />
                </AccountSettingRow>
              )}

              {!_.isUndefined(interfaceLanguage) && (
                <div className="flex items-center justify-between gap-2">
                  <label className="font-light">Language</label>
                  <SimpleSelect
                    // Keep a language set elsewhere (e.g. registering with a
                    // French browser stores "fr") so the select can show it
                    options={_.uniq([
                      ...ACCOUNT_LANGUAGE_OPTIONS.map((o) => o.value),
                      ...(site?.interfaceLanguage
                        ? [site.interfaceLanguage]
                        : []),
                    ])}
                    value={interfaceLanguage}
                    onChange={setInterfaceLanguage}
                    valueGetter={(o) => o}
                    labelGetter={languageLabel}
                    className="w-[160px]"
                    side="top"
                  />
                </div>
              )}

              {/* The server filters these keywords out of feeds. They add to
                  the device's keyword filters. */}
              {blockingKeywords && (
                <div className="flex flex-col gap-2">
                  <label className="font-light">Blocked keywords</label>
                  {[...blockingKeywords, ""].map((keyword, index) => (
                    <Input
                      key={index}
                      value={keyword}
                      placeholder="Keyword to block..."
                      onChange={(e) => {
                        const next = [...blockingKeywords];
                        next[index] = e.target.value;
                        setBlockingKeywords(next);
                      }}
                      onBlur={() =>
                        setBlockingKeywords(pruneKeywords(blockingKeywords))
                      }
                    />
                  ))}
                  <span className="text-muted-foreground text-xs">
                    Hides posts with any of these in the title, body or link.
                    Each needs 3 to 50 characters.
                  </span>
                </div>
              )}

              <Button variant="outline">Save profile</Button>
            </form>

            {account && !isPieFed && <ChangePasswordForm account={account} />}
          </div>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
