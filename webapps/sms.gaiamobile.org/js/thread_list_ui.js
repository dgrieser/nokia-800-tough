/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Template, Utils, Threads, Contacts, Threads,
         WaitingScreen, MessageManager, TimeHeaders,
         Drafts, Thread, ThreadUI, OptionMenu, ActivityPicker,
         PerformanceTestingHelper, StickyHeader, Navigation,
         InterInstanceEventDispatcher,
         SelectionHandler,
         Settings,
         LazyLoader
*/
/*exported ThreadListUI */
(function(exports) {
  'use strict';

  const privateMembers = new WeakMap();

  let skNewMessage = {
    l10nId: 'new-message',
    priority: 1,
    method: function() {
      ThreadUI.addAllEventListener();
      window.performance.mark('new-message-start');
      window.performance.mark('add-attachment-start');
      Navigation.toPanel('composer');
    }
  };

  let skDeleteThread = {
    l10nId: 'delete-thread',
    priority: 5,
    method: function() {
      Utils.speedPressPrevent(function() {
        ThreadListUI.deleteCurrentThread();
      });
    }
  };

  let skCreateNewContact = {
    l10nId: 'create-new-contact',
    priority: 5,
    method: function() {
      if (ThreadListUI.currentThread) {
        let thread = null;
        let recipient = null;
        let threadid = ThreadListUI.currentThread.dataset.threadId;
        if (ThreadListUI.currentThread.classList.contains('draft')) {
          thread = Drafts.get(threadid);
          recipient = thread.recipients[0];
        } else {
          thread = Threads.get(threadid);
          recipient = thread.participants[0];
        }

        let opt;

        if (Utils.isEmailAddress(recipient)) {
          opt = { email: recipient };
        } else {
          opt = { tel: recipient };
        }

        ActivityPicker.createNewContact(opt, () => {
          ThreadListUI.updateSKs();
        });
      }
    }
  };

  let skAddToContact = {
    l10nId: 'add-to-contact',
    priority: 5,
    method: function() {
      if (ThreadListUI.currentThread) {
        let thread = null;
        let tel = null;
        let threadid = ThreadListUI.currentThread.dataset.threadId;
        if (ThreadListUI.currentThread.classList.contains('draft')) {
          thread = Drafts.get(threadid);
          tel = thread.recipients[0];
        } else {
          thread = Threads.get(threadid);
          tel = thread.participants[0];
        }

        let opt = {
          tel: tel
        };
        ActivityPicker.addToExistingContact(opt, () => {
          ThreadListUI.updateSKs();
        });
      }
    }
  };

  let skSelectThread = {
    l10nId: 'select-thread',
    priority: 5,
    method: function() {
      ThreadListUI.startEdit();
    }
  };

  let skSettings = {
    l10nId: 'settings',
    priority: 5,
    method: function() {
      Navigation.toPanel("settings-view");
    }
  };

  let skSelectAll = {
    l10nId: 'select-all',
    priority: 1,
    method: function() {
      ThreadListUI.clickCheckUncheckAllButton();
    }
  };

  let skDeselectAll = {
    l10nId: 'deselect-all',
    priority: 1,
    method: function() {
      ThreadListUI.clickCheckUncheckAllButton();
    }
  };

  let skDelete = {
    l10nId: 'delete',
    priority: 3,
    method: function() {
      window.performance.mark('allThreads-delete-start');
      ThreadListUI.delete();
    }
  };

  let skSelect = {
    l10nId: 'select',
    priority: 2
  };

  let skCancel = {
    l10nId: 'cancel',
    priority: 1,
    method: function() {
      ActivityHandler.leaveActivity();
    }
  };

  let skDeSelect = {
    l10nId: 'deselect',
    priority: 2
  };

  let skSearch = {
    l10nId: 'search',
    priority: 5,
    method: function() {
      Navigation.toPanel('search-message-view');
    }
  };

  let skNext = {
    l10nId: 'next',
    priority: 3,
    method: function() {
      ThreadListUI.setGroup.classList.add('hide');
      ThreadListUI.setWait.classList.remove('hide');
      createMenu(option_menu_wait);
      Settings.defaultPhoneNumber = ThreadListUI.inputGroupNumber.value;
      Utils.setSettingsValue(
          { 'ril.mms.phoneNumber': Settings.defaultPhoneNumber });
      ThreadListUI.setNumber.classList.add('hide');
      ThreadListUI.cacheList.classList.remove('hide');
      ThreadListUI.container.classList.add('hide');
      MessageCacheRestore.isFTUDisabled = 'true';
      MessageCache.setFTUMessage();

      if (Startup.isActivity) {
        ActivityHandler.nextFTUinActivity();
      } else {
        if (!Startup.useCache) {
          ThreadListUI.noMessages.classList.remove('hide');
          ThreadListUI.noResultMessage.focus();
        } else {
          ThreadListUI.container.classList.remove('hide');
          NavigationMap.setFocus(0);
        }
        ThreadListUI.updateSKs();
      }
    }
  };

  let skWait = {
    l10nId: 'wait',
    priority: 3
  };

  let option_menu_edit_normal = [
    skSelectAll, skSelect
  ];

  let option_menu_edit_choose = [
    skSelectAll, skSelect, skDelete
  ];

  let option_menu_edit_deselect_choose = [
    skSelectAll, skDeSelect, skDelete
  ];

  let option_menu_edit_deselect_choosedall = [
    skDeselectAll, skDeSelect, skDelete
  ];

  let option_menu_no_thread = [
    skNewMessage, skSettings
  ];

  let option_menu_thead_has_contact = [
    skNewMessage, skSelect, skDeleteThread, skSelectThread,
    skSearch, skSettings
  ];

  let option_menu_thread_no_contact = [
    skNewMessage, skSelect, skDeleteThread, skCreateNewContact,
    skAddToContact, skSelectThread, skSearch, skSettings
  ];

  let option_menu_activity_threadlist = [
    skCancel, skSelect
  ];

  let option_menu_activity_threadlist_noMessage = [
    skCancel
  ];

  let option_menu_next = [
    skNext
  ];

  let option_menu_wait = [
    skWait
  ];

  function createMenu(actions) {
    if (!actions) return;
    let params = {
      header: { l10nId: 'options' },
      items: actions
    };
    if (exports.option) {
      exports.option.initSoftKeyPanel(params);
    } else {
      exports.option = new SoftkeyPanel(params);
    }
    exports.option.show();

    removeSoftKeyCache();
  }

  // Need delete the cache to confirm the page switch more smooth.
  function removeSoftKeyCache() {
    let softKeyCache = document.getElementById('cachedSoftkeyPanel');
    if (softKeyCache) {
      let softKeyCacheNodes = softKeyCache.children;
      for(let i = 0; i < softKeyCacheNodes.length; i++) {
        softKeyCacheNodes[i].querySelector('.sk-button').innerHTML = '';
      }
    }
  }

  function createBdiNode(content) {
    let bdi = document.createElement('bdi');
    bdi.textContent = content;
    return bdi;
  }

  let ThreadListUI = {
    readyDeferred: Utils.Promise.defer(),

    draftLinks: null,
    draftRegistry: null,
    DRAFT_SAVED_DURATION: 2000,
    FIRST_PANEL_THREAD_COUNT: 9, // counted on a Peak

    // Used to track timeouts
    timeouts: {
      onDraftSaved: null
    },

    // Used to track the current number of rendered
    // threads. Updated in ThreadListUI.renderThreads
    count: 0,

    // Set to |true| when in edit mode
    inEditMode: false,

    currentThread: null,

    isSwitchCase: false,

    dialogShown: false,

    // Control whether recovery focus.
    recoveryFocusFlag: false,

    init: function thlui_init() {
      this.tmpl = {
        thread: Template('messages-thread-tmpl')
      };

      this.initElement();

      this.container.addEventListener(
        'click', this
      );

      window.addEventListener('index-changed', this);
      window.addEventListener('keydown', this);

      this.editForm.addEventListener('submit', this);

      navigator.mozContacts.addEventListener(
        'contactchange',
        this.updateContactsInfo.bind(this)
      );

      // Because app can be background,
      // so we need always observer the time zone.
      Utils.observerSettingsValue('time.timezone', () => {
        let threads = this.container.getElementsByTagName('li');
        [].forEach.call(threads, (thread) => {
          let threadObject = {
            'id': thread.dataset.threadId,
            'timestamp': thread.dataset.time
          };
          const timeZoneWait = 50;
          setTimeout(() => {
            this.updateCacheContainerId(threadObject);
          }, timeZoneWait);
        });
      });

      this.draftLinks = new Map();
      this.draftRegistry = {};

      MessageManager.on('message-sending', this.onMessageSending.bind(this));
      MessageManager.on('message-received', this.onMessageReceived.bind(this));
      MessageManager.on('threads-deleted', this.onThreadsDeleted.bind(this));

      InterInstanceEventDispatcher.on(
        'drafts-changed',
        this.renderDrafts.bind(this, true /* force update */)
      );

      privateMembers.set(this, {
        // Very approximate number of letters that can fit into title for the
        // group thread, "100" is for all paddings, image width and so on,
        // 10 is approximate English char width for current 18px font size
        groupThreadTitleMaxLength: (window.innerWidth - 100) / 10,
        threadSwitchId: 1
      });

      this.sticky = null;
      this.initSks();

      this.openElement = this.alertOpen.bind(this);
      this.closeElement = this.alertClose.bind(this);
    },

    initElement: function thui_initElement() {
      // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=854413
      [
        'container', 'no-messages', 'set-number', 'number-form', 'set-group',
        'set-wait', 'check-uncheck-all-button','composer-link',
        'delete-button', 'edit-header','options-button',
        'edit-mode', 'edit-form', 'draft-saved-banner'
      ].forEach(function(id) {
        this[Utils.camelCase(id)] = document.getElementById('threads-' + id);
      }, this);

      this.cacheList = document.getElementById('cache-list');

      this.mainWrapper = document.getElementById('main-wrapper');

      this.noResultMessage = document.getElementById('no-result-message');

      this.inputGroupNumber = document.getElementById('group-number-input');
    },

    initStickyHeader: function thlui_initStickyHeader() {
      if (!this.sticky) {
        this.sticky =
          new StickyHeader(this.container, document.getElementById('sticky'));
      }
    },

    afterEnter: function thui_afterEnter() {
      // XXX, not good to use classList as a judgement, we should
      // add a variable later to mark no messages.
      if (this.noMessages &&
          !this.noMessages.classList.contains('hide')) {
        this.noResultMessage.focus();
      }
      this.updateSKs();
      window.addEventListener('gaia-confirm-open', this.openElement);
      window.addEventListener('gaia-confirm-close', this.closeElement);
      window.addEventListener('gaia-confirm-start-close',
                              Utils.onDialogBeginClose);
    },

    beforeLeave: function thlui_beforeLeave() {
      // This should be in afterLeave, but the edit mode interface does not seem
      // to slide correctly. Bug 1009541
      this.cancelEdit();
      window.removeEventListener('gaia-confirm-open', this.openElement);
      window.removeEventListener('gaia-confirm-close', this.closeElement);
      window.removeEventListener('gaia-confirm-start-close',
                                 Utils.onDialogBeginClose);
    },

    alertOpen: function thui_alertOpen() {
      this.dialogShown = true;
    },

    alertClose: function thui_alertClose() {
      this.dialogShown = false;
      Utils.menuOptionVisible = false;
      this.updateSKs();
    },

    getAllInputs: function thlui_getAllInputs() {
      if (this.container) {
        return Array.prototype.slice.call(
          this.container.querySelectorAll('input[type=checkbox]')
        );
      } else {
        return [];
      }
    },

    setContact: function thlui_setContact(node) {
      // TODO Bug 1014226 will introduce a draftId instead of threadId for
      // drafts, this will allow removing the test with is-draft here.
      let threadOrDraft = node.classList.contains('is-draft') ?
        Drafts.get(node.dataset.threadId) :
        Threads.get(node.dataset.threadId);

      if (!threadOrDraft) {
        throw new Error('Thread node is invalid!');
      }

      let threadNumbers = threadOrDraft.participants ||
                          threadOrDraft.recipients;

      let titleContainer = node.querySelector('.threadlist-item-title');
      let title = titleContainer.firstElementChild;

      if (!threadNumbers || !threadNumbers.length) {
        title.setAttribute('data-l10n-id', 'no-recipient');
        return;
      }

      function* updateThreadNode(number) {
        let contact = yield ThreadListUI.findContact(number, { photoURL: true });

        title.textContent = contact.title || number;

        let photoUrl = node.dataset.photoUrl;
        if (photoUrl) {
          window.URL.revokeObjectURL(photoUrl);
        }

        if (contact.photoURL) {
          node.dataset.photoUrl = contact.photoURL;
        } else if (photoUrl) {
          node.dataset.photoUrl = '';
        }
      }

      function* updateGroupThreadNode(numbers, titleMaxLength) {
        let contactTitle, number;
        let i = 0;
        let threadTitleLength = 0;

        let groupTitle = document.createElement('span');
        let separatorNode = document.createElement('span');
        separatorNode.setAttribute(
          'data-l10n-id',
          'thread-participant-separator'
        );
        let extraNode = document.createElement('span');
        let firstContact;

        while (i < numbers.length) {
          number = numbers[i++];

          contactTitle = (yield ThreadListUI.findContact(number)).title ||
                         number;

          if (i === 1) {
            firstContact = contactTitle;
          }

          if (threadTitleLength > 0) {
            groupTitle.appendChild(separatorNode.cloneNode(true));
          }
          groupTitle.appendChild(createBdiNode(contactTitle));

          threadTitleLength += contactTitle.length;

          // reset the thread number to a(+n) when the number length over.
          if (threadTitleLength > titleMaxLength) {
            groupTitle = document.createElement('span');
            groupTitle.classList.add('thread-header-title');
            let groupTitleElement = createBdiNode(firstContact);
            groupTitleElement.classList.add('ellipsis-dir-fix');
            groupTitle.appendChild(groupTitleElement);
            extraNode.textContent = '(+' + (numbers.length - 1) + ')';
            groupTitle.appendChild(extraNode);
            break;
          }
        }

        titleContainer.replaceChild(groupTitle, title);
      }

      if (threadNumbers.length === 1) {
        return Utils.Promise.async(updateThreadNode)(threadNumbers[0]);
      }

      // The window will be null when launch app at background,
      // so need reset it if not good.
      if (privateMembers.get(this).groupThreadTitleMaxLength <= 0) {
        privateMembers.set(this,
          // Very approximate number of letters that can fit into title for the
          // group thread, "100" is for all paddings, image width and so on,
          // 10 is approximate English char width for current 18px font size
          { groupThreadTitleMaxLength: (window.innerWidth - 100) / 10 });
      }

      return Utils.Promise.async(updateGroupThreadNode)(
        threadNumbers, privateMembers.get(this).groupThreadTitleMaxLength
      );
    },

    findContact: function(number, options) {
      let defer = Utils.Promise.defer();

      Contacts.findByAddress(number, function(contacts) {
        let details = Utils.getContactDetails(number, contacts, options);

        defer.resolve(details);
      });

      return defer.promise;
    },

    handleEvent: function thlui_handleEvent(event) {
      if (!Navigation.isCurrentPanel('thread-list')) {
        // Need prevent the key event when current page is not main page.
        if (event.type === 'keydown' && event.key === 'Backspace') {
          event.preventDefault();
        }
        return;
      }
      let draftId;

      switch (event.type) {
        case 'index-changed':
          if (event.detail.panel === 'thread-list') {
            this.currentThread = event.detail.focusedItem;
            if (!window.option ||
                ((window.option && !window.option.menuVisible) &&
                 !this.dialogShown)) {
              this.updateSKs();
            }
          }
          break;
        case 'submit':
          event.preventDefault();
          break;
        case 'keydown':
          switch (event.key) {
            case 'Enter':
              // Handle selection in selection module
              if (this.inEditMode || Navigation.isCurrentPanel('settings-view')) {
                return;
              }

              let aTarget = event.target.querySelector('a');
              if ((draftId = this.draftLinks.get(aTarget))) {
                // TODO: Bug 1010216: remove this
                ThreadUI.draft = Drafts.get(draftId);
              } else {
                window.addEventListener('draft-render-completed',
                                        function draftComplete() {
                  window.removeEventListener('draft-render-completed',
                                             draftComplete);
                  draftId = ThreadListUI.draftLinks.get(aTarget);
                  ThreadUI.draft = Drafts.get(draftId);
                });
              }
              let parent = event.target;
              let parentThreadId = parent.dataset.threadId;

              if (parentThreadId) {
                event.preventDefault();
                // TODO Bug 1014226 will introduce a draftId instead of threadId for
                // drafts, this will allow removing the test with is-draft here.
                ThreadUI.addAllEventListener();
                if (parent.classList.contains('is-draft')) {
                  Navigation.toPanel('composer', {
                    draftId: +parentThreadId
                  });
                } else {
                  window.performance.mark('SMS-enterThread-start');
                  Navigation.toPanel('thread', {
                    id: +parentThreadId
                  });
                }
              }
              break;
            case 'Backspace':
            case 'BrowserBack':
              if (this.inEditMode) {
                event.preventDefault();
                this.cancelEdit();
                this.updateSKs();
              } else {
                if (Navigation.isCurrentPanel('thread-list')) {
                  let el = document.getElementById('option-menu');
                  if (!el || !el.classList.contains('visible')) {
                    // Delete cache when we save the new cache.
                    MessageCache.clear('threads-container');
                    // We do not need cache the no message page.
                    // Can not save cache when the FTU is enabled,
                    // the page will not be prepared at this situation.
                    if (this.noMessages.classList.contains('hide') &&
                        MessageCacheRestore.isFTUDisabled) {
                      this.saveCache();
                    }
                  }
                }
              }
              break;
          }
          break;
      }
    },

    saveCache: function thui_saveCache() {
      let cacheHtml = document.getElementById('threads-container');
      let codeNode = MessageCache
        .cloneAsInertNodeAvoidingCustomElementHorrors(cacheHtml);
      MessageCache.saveFromNode('threads-container', codeNode);
    },

    checkInputs: function thlui_checkInputs() {
      let selected = this.selectionHandler.selectedCount;

      if (selected === this.allInputs.length) {
        this.checkUncheckAllButton.setAttribute('data-l10n-id', 'deselect-all');
      } else {
        this.checkUncheckAllButton.setAttribute('data-l10n-id', 'select-all');
      }
      if (selected) {
        navigator.mozL10n.setAttributes(this.editMode, 'selected-threads', {
          n: selected
        });
      } else {
        navigator.mozL10n.setAttributes(this.editMode, 'selected-threads', {
          n: 0
        });
      }
    },

    clickCheckUncheckAllButton: function() {
      this.checkUncheckAllButton.click();
    },

    removeThread: function thlui_removeThread(threadId) {
      let li = document.getElementById('thread-' + threadId);
      let parent, draftId;
      let photoUrl = li && li.dataset.photoUrl;

      // Revoke the contact photo while deletion for avoiding intermittent
      // photo disappear issue.
      if (photoUrl) {
        window.URL.revokeObjectURL(photoUrl);
      }

      if (li) {
        parent = li.parentNode;
        li.remove();
      }

      if ((draftId = this.draftLinks.get(li))) {
        this.draftLinks.delete(li);

        delete this.draftRegistry[draftId];
      }

      // remove the header and the ul for an empty list
      if (parent && !parent.firstElementChild) {
        parent.previousSibling.remove();
        parent.remove();

        this.sticky && this.sticky.refresh();

        // if we have no more elements, set empty classes
        if (!this.container.querySelector('li')) {
          this.setEmpty(true);
        }
      }
    },

    // Since removeThread will revoke list photoUrl at the end of deletion,
    // please make sure url will also be revoked if new delete api remove threads
    // without calling removeThread in the future.
    delete: function thlui_delete() {
      function performDeletion() {
        /* jshint validthis: true */

        let threadIdsToDelete = [],
            messageIdsToDelete = [],
            threadCountToDelete = 0,
            selected = ThreadListUI.selectionHandler.selectedList;

        function exitEditMode() {
          ThreadListUI.cancelEdit();
          WaitingScreen.hide();
          ThreadListUI.updateSKs();
        }

        function onAllThreadMessagesRetrieved() {
          if (!--threadCountToDelete) {
            MessageManager.deleteMessages(messageIdsToDelete);

            threadIdsToDelete.forEach(function(threadId) {
              ThreadListUI.deleteThread(threadId);
            });

            messageIdsToDelete = threadIdsToDelete = null;

            exitEditMode();
          }
        }

        function onThreadMessageRetrieved(message) {
          messageIdsToDelete.push(message.id);
          return true;
        }

        WaitingScreen.show();
        if (exports.option) {
          exports.option.hide();
        }

        threadIdsToDelete = selected.reduce(function(list, value) {
          // Coerce the threadId back to a number MobileMessageFilter and all
          // other platform APIs expect this value to be a number.
          let threadId = +value;
          let isDraft = typeof Threads.get(threadId) === 'undefined';

          if (isDraft) {
            Drafts.delete(Drafts.get(threadId));
            ThreadListUI.removeThread(threadId);
          } else {
            list.push(threadId);
          }

          return list;
        }, []);

        // That means that we've just removed some drafts
        if (threadIdsToDelete.length !== selected.length) {
          Drafts.store();
        }

        if (!threadIdsToDelete.length) {
          exitEditMode();
          return;
        }

        threadCountToDelete = threadIdsToDelete.length;

        threadIdsToDelete.forEach(function(threadId) {
          MessageManager.getMessages({
            // Filter and request all messages with this threadId
            filter: { threadId: threadId },
            each: onThreadMessageRetrieved,
            end: onAllThreadMessagesRetrieved
          });
        });
      }

      function deleteCallback() {
        performDeletion();
      }
      Utils.confirmAlert('confirmation-title',
                         { id: 'deleteThreads-confirmation2',
                           args: { n: this.selectionHandler.selectedCount } },
                         'cancel', null, null, null, 'delete', deleteCallback);
    },

    setEmpty: function thlui_setEmpty(empty) {
      let addWhenEmpty = empty ? 'add' : 'remove';
      let removeWhenEmpty = empty ? 'remove' : 'add';

      this.noMessages.classList[removeWhenEmpty]('hide');
      this.container.classList[addWhenEmpty]('hide');

      // We should not update sks and focus if lunch from activity
      // and last page is not thread list.
      if (empty &&
          (!Startup.isActivity || Navigation.isCurrentPanel('thread-list'))) {
        SubHeader.resetHeaderNumber();
        this.noResultMessage.focus();
      }
    },

    initSks: function() {
      if (MessageCacheRestore.isFTUDisabled) {
        if (!Startup.useCache) {
          createMenu(option_menu_no_thread);
        }
      } else {
        createMenu(option_menu_next);
      }
    },

    updateSKs: function() {
      let threadid = null;
      if (!MessageCacheRestore.isFTUDisabled) {
        return;
      }
      if (document.getElementById('loading').classList.contains('show-loading')) {
        return;
      }
      if (Utils.menuOptionVisible) {
        return;
      }
      if (this.currentThread) {
        threadid = this.currentThread.dataset.threadId;
      }
      if (Startup.isActivity && Navigation.isCurrentPanel('thread-list')) {
        if (this.noMessages.classList.contains('hide')) {
          createMenu(option_menu_activity_threadlist);
        } else {
          this.noResultMessage.querySelector('p').classList.add('hide');
          createMenu(option_menu_activity_threadlist_noMessage);
        }
        return;
      }
      if (this.inEditMode) {
        let selected = this.selectionHandler.selectedCount;
        if (selected === this.allInputs.length) {
          createMenu(option_menu_edit_deselect_choosedall);
        } else if (selected > 0) {
          if (document.activeElement.querySelectorAll('.thread-checked').length !== 0 ||
              document.activeElement.classList.contains('thread-checked')) {
            createMenu(option_menu_edit_deselect_choose);
          } else {
            createMenu(option_menu_edit_choose);
          }
        } else {
          createMenu(option_menu_edit_normal);
        }
      } else {
        if (this.noMessages.classList.contains('hide')) {
          if (threadid) {
            let tel;
            let thread;
            if (this.currentThread.classList.contains('draft')) {
              thread = Drafts.get(threadid);
              if (thread) {
                tel = thread.recipients[0];
              }
            } else {
              thread = Threads.get(threadid);
              if (thread) {
                tel = thread.participants[0];
              }
            }
            if (!thread) {
              return;
            }
            createMenu(option_menu_thread_no_contact);
            if (thread && tel) {
              Contacts.findByPhoneNumber(tel, (contact)=> {
                if (contact && contact.length) {
                  createMenu(option_menu_thead_has_contact);
                }
              });
            } else {
              createMenu(option_menu_thead_has_contact);
            }
          }
        } else {
          createMenu(option_menu_no_thread);
        }
      }
    },

    showOptions: function thlui_options() {
      let params = {
        items: [{
          l10nId: 'settings',
          method: function oSettings() {
            Navigation.toPanel('settings-view');
          }
        },{ // Last item is the Cancel button
          l10nId: 'cancel',
          incomplete: true
        }]
      };

      // Add delete option when list is not empty
      if (this.noMessages.classList.contains('hide')) {
        params.items.unshift({
          l10nId: 'selectThreads-label',
          method: this.startEdit.bind(this)
        });
      }

      new OptionMenu(params).show();
    },

    startEdit: function thlui_edit() {
      function editModeSetup() {
        /*jshint validthis:true */
        this.inEditMode = true;
        this.selectionHandler.cleanForm();
        this.mainWrapper.classList.toggle('edit');
      }

      if (!this.selectionHandler) {
        LazyLoader.load('js/selection_handler.js', () => {
          this.selectionHandler = new SelectionHandler({
            // Elements
            container: this.container,
            checkUncheckAllButton: this.checkUncheckAllButton,
            // Methods
            checkInputs: this.checkInputs.bind(this),
            getAllInputs: this.getAllInputs.bind(this),
            isInEditMode: this.isInEditMode.bind(this),
            updateSKs: this.updateSKs.bind(this)
          });
          editModeSetup.call(this);
        });
      } else {
        editModeSetup.call(this);
      }
    },

    isInEditMode: function thlui_isInEditMode() {
      return this.inEditMode;
    },

    cancelEdit: function thlui_cancelEdit() {
      this.inEditMode = false;
      this.mainWrapper.classList.remove('edit');

      if (!this.noResultMessage.classList.contains('hide')) {
        if (window.performance.getEntriesByName(
            'allThreads-delete-start', 'mark').length > 0) {
          window.performance.mark('allThreads-delete-end');
          window.performance.measure('performance-allThreads-delete',
            'allThreads-delete-start', 'allThreads-delete-end');
          window.performance.clearMarks('allThreads-delete-start');
          window.performance.clearMarks('allThreads-delete-end');
        }
      }
    },

    renderDrafts: function thlui_renderDrafts(force) {
      // Request and render all threads with drafts
      // or thread-less drafts.
      return Drafts.request(force).then(() => {
        Drafts.forEach(function(draft, threadId) {
          if (threadId) {
            // Find draft-containing threads that have already been rendered
            // and update them so they mark themselves appropriately
            let el = document.getElementById('thread-' + threadId);
            if (el) {
              this.updateThread(Threads.get(threadId));
            }
          } else {
            // Safely assume there is a threadless draft
            this.setEmpty(false);

            // If there is currently no list item rendered for this
            // draft, then proceed.
            if (!this.draftRegistry[draft.id]) {
              this.appendThread(
                Thread.create(draft)
              );
            }
          }
        }, this);

        this.sticky && this.sticky.refresh();
      });
    },

    renderCacheDrafts: function thlui_renderCacheDrafts() {
      return Drafts.request().then(() => {
        Drafts.forEach((draft) => {
          if (draft) {
            this.setEmpty(false);
            let node = document.getElementById('thread-' + draft.id);
            if (node) {
              let draftCache = node.querySelector('a');
              this.setContact(node);
              this.draftLinks.set(draftCache, draft.id);
            }
            this.addLostPage(draft);
          }
        });
        this.deleteExtraPage();
        window.dispatchEvent(new CustomEvent('draft-render-completed'));
      });
    },

    prepareRendering: function thlui_prepareRendering() {
      if (!Startup.useCache) {
        this.container.innerHTML = '';
        this.renderDrafts();
      } else {
        this.renderCacheDrafts();
      }
    },

    startRendering: function thlui_startRenderingThreads() {
      this.setEmpty(false);
    },

    finalizeRendering: function thlui_finalizeRendering(empty) {
      if ((empty && !Startup.useCache) || Startup.firstDraftCheck) {
        Startup.firstDraftCheck = false;
        this.setEmpty(true);
      }

      if (!empty) {
        TimeHeaders.updateAll('header[data-time-update]');
      }

      this.sticky && this.sticky.refresh();

      // We should not update sks and focus if lunch from activity
      // and last page is not thread list.
      if (!Startup.isActivity || Navigation.isCurrentPanel('thread-list')) {
        this.updateSKs();
      }
    },

    ensureReadAheadSetting: function thlui_ensureReadAheadSettting() {
      Settings.setReadAheadThreadRetrieval(this.FIRST_PANEL_THREAD_COUNT);
    },

    judgeNumberInputed: function thlui_judgeNumberInputed() {
      this.setGroup.classList.remove('hide');
      this.setWait.classList.add('hide');
      this.inputGroupNumber.focus();
      this.numberForm.classList.add('focus');
    },

    renderThreads: function thlui_renderThreads(firstViewDoneCb) {
      window.performance.mark('willRenderThreads');
      PerformanceTestingHelper.dispatch('will-render-threads');

      let hasThreads = false;
      let firstPanelCount = this.FIRST_PANEL_THREAD_COUNT;

      this.prepareRendering();

      let firstViewDone = function firstViewDone() {
        this.initStickyHeader();

        if (typeof firstViewDoneCb === 'function') {
          firstViewDoneCb();
        }
      }.bind(this);

      function onRenderThread(thread) {
        /* jshint validthis: true */
        // Register all threads to the Threads object.
        Threads.set(thread.id, thread);

        // If one of the requested threads is also the currently displayed thread,
        // update the header immediately
        // TODO: Revise necessity of this code in bug 1050823
        if (Navigation.isCurrentPanel('thread', { id: thread.id })) {
          ThreadUI.updateHeaderData();
        }

        if (!hasThreads) {
          hasThreads = true;
          this.startRendering();
        }

        if (!Startup.useCache) {
          this.appendThread(thread);
        } else {
          // Update some status for cache, maybe there are better way
          // to update them. Use it first.
          this.addLostThread(thread).then(() => {
            this.updateCacheContact(thread);
            this.updateCacheContainerId(thread);
            this.updateCacheUnreadStatus(thread);
          });
        }

        if (--firstPanelCount === 0) {
          // dispatch visually-complete and content-interactive when rendered
          // threads could fill up the top of the visiable area
          firstViewDone();
        }
      }

      function onThreadsRendered() {
        /* jshint validthis: true */

        /* We set the view as empty only if there's no threads and no drafts,
         * this is done to prevent races between renering threads and drafts. */
        if (MessageCacheRestore.isFTUDisabled) {
          if (hasThreads) {
            Startup.firstDraftCheck = false;
          }
          this.finalizeRendering(!(hasThreads || Drafts.size));
        }

        if (firstPanelCount > 0) {
          // dispatch visually-complete and content-interactive when rendering
          // ended but threads could not fill up the top of the visiable area
          firstViewDone();
        }
      }

      function onDone() {
        /* jshint validthis: true */

        this.readyDeferred.resolve();
        this.deleteExtraCacheThread();

        this.ensureReadAheadSetting();

        // If not cache flow, the focus need be recovery to confirm useful.
        const FOCUSTIMEOUT = 100;
        if (document.activeElement.tagName === 'BODY') {
          setTimeout(() => {
            this.recoveryThreadFocus();
            SubHeader.updateSubNumber();
            this.currentThread = document.activeElement;
            this.updateSKs();
          }, FOCUSTIMEOUT);
        }

        // Delete cache when we save the new cache.
        MessageCache.clear('threads-container');
        // We do not need cache the no message page.
        // Can not save cache when the FTU is enabled,
        // the page will not be prepared at this situation.
        if (ThreadListUI.noMessages.classList.contains('hide') &&
            MessageCacheRestore.isFTUDisabled) {
          this.saveCache();
        }
      }

      MessageManager.getThreads({
        each: onRenderThread.bind(this),
        end: onThreadsRendered.bind(this),
        done: onDone.bind(this)
      });

      return this.readyDeferred.promise;
    },

    deleteExtraPage: function thui_deleteExtraPage() {
      let draftPages = document.querySelectorAll('.is-draft');
      for (let i = 0; i < draftPages.length; i++) {
        let draftId = draftPages[i].id;
        draftId = draftId.substr(draftId.indexOf('-') + 1);
        let thread = Drafts.get(draftId);
        if (!thread) {
          this.deleteThread(draftId);
          this.recoveryFocusFlag = true;
        }
      }

      if (this.recoveryFocusFlag) {
        this.recoveryThreadFocus();
      }
    },

    addLostPage: function thui_addLostPage(draft) {
      let draftArray = [];
      let threadArray = [];
      const timeOutDraft = 100;
      let draftPages = document.querySelectorAll('.is-draft');
      for (let i = 0; i < draftPages.length; i++) {
        let draftId = draftPages[i].id;
        draftId = draftId.substr(draftId.indexOf('-') + 1);
        draftArray.push(draftId);
      }
      let draftThread = document.querySelectorAll('.has-draft');
      for (let j = 0; j < draftThread.length; j++) {
        let threadId = draftThread[j].id;
        threadId = threadId.substr(threadId.indexOf('-') + 1);
        threadArray.push(threadId);
      }

      let value = draft.id;
      let indexDraft = draftArray.indexOf(value.toString());
      if (indexDraft === -1) {
        setTimeout(() => {
          let threadLost = Thread.create(draft);
          // Need ignore the thread draft becasue it is impossible to be lost.
          let indexThread = threadArray.indexOf(threadLost.id.toString());
          if (indexThread === -1) {
            this.appendThread(threadLost);
            this.recoveryFocusFlag = true;
          }
        }, timeOutDraft);
      }
    },

    deleteExtraCacheThread: function thui_deleteExtraCacheThread() {
      let threadPages = document.querySelectorAll('.threadlist-item');
      for (let i = 0; i < threadPages.length; i++) {
        if (threadPages[i].classList.contains('is-draft')) {
          continue;
        }
        let threadId = threadPages[i].id;
        threadId = threadId.substr(threadId.indexOf('-') + 1);
        let thread = Threads.get(threadId);
        if (!thread) {
          this.deleteThread(threadId);
          this.recoveryFocusFlag = true;
        }
      }

      if (this.recoveryFocusFlag) {
        this.recoveryThreadFocus();
      }
    },

    addLostThread: function thui_addLostThread(thread) {
      let threadArray = [];
      const timeOutThread = 100;
      let threadPages = document.querySelectorAll('.threadlist-item');
      for (let i = 0; i < threadPages.length; i++) {
        let threadId = threadPages[i].id;
        threadId = threadId.substr(threadId.indexOf('-') + 1);
        threadArray.push(threadId);
      }

      let value = thread.id;
      let index = threadArray.indexOf(value.toString());
      return new Promise((resolve) => {
        if (index === -1) {
          setTimeout(() => {
            this.appendThread(thread);
            this.recoveryFocusFlag = true;
            resolve();
          }, timeOutThread);
        } else {
          resolve();
        }
      });
    },

    recoveryThreadFocus: function thui_recoveryThreadFocus() {
      if (Navigation.isCurrentPanel('thread-list')) {
        let focusPage = document.querySelectorAll('.focus');
        for(let i = 0; i < focusPage.length; i++) {
          focusPage[i].blur();
          focusPage[i].classList.remove('focus');
        }
        let threadPage = document.querySelector('.threadlist-item');
        if (threadPage) {
          threadPage.classList.add('focus');
          threadPage.focus();
          document
            .querySelector('.focus')
            .parentNode.previousElementSibling.scrollIntoView();
        }
      }
      this.recoveryFocusFlag = false;
    },

    updateCacheContact: function thui_updateCacheContact(thread) {
      function searchContacts(DBNumber, threadDOM) {
        Contacts.findByAddress(DBNumber, function(contacts) {
          let details = Utils.getContactDetails(DBNumber, contacts);
          if (threadDOM) {
            if (details.isContact && details.title !== null) {
              threadDOM.textContent = details.title;
            } else {
              threadDOM.textContent = DBNumber;
            }
          }
        });
      }

      let bdiNodes = [];
      let detailsDOM = document.getElementById('thread-' + thread.id);
      if (detailsDOM) {
        let detailsDOMName = detailsDOM.querySelector('.threadlist-item-title');
        let detailsDOMBdi = detailsDOMName.querySelectorAll('bdi');
        for (let index = 0; index < detailsDOMBdi.length; index++) {
          bdiNodes.push(detailsDOMBdi[index]);
        }

        for (let i = 0; i < thread.participants.length; i++) {
          let number = thread.participants[i];
          let threadListNode = bdiNodes[i];
          if (threadListNode) {
            searchContacts(number, threadListNode);
          } else {
            searchContacts(number, null);
          }
        }
      }
    },

    // We should update the container id if the time zone change.
    updateCacheContainerId: function thui_updateCacheThreadId(thread) {
      let timestamp = +thread.timestamp;
      let drafts = Drafts.byThreadId(thread.id);
      if (drafts.length) {
        timestamp = Math.max(drafts.latest.timestamp, timestamp);
      }
      let dayDate = Utils.getDayDate(timestamp);
      let threadNode = document.getElementById('thread-' + thread.id);
      if (threadNode) {
        threadNode.parentNode.id = 'threadsContainer_' + dayDate;
      }
    },

    updateCacheUnreadStatus: function thui_updateCacheUnreadStatus(thread) {
      let readState = (thread.unreadCount === 0) ? 'read' : 'unread';
      this.mark(thread.id, readState);
    },

    createThread: function thlui_createThread(record) {
      // Create DOM element
      let li = document.createElement('li');
      let [timestamp, type, participants, id, bodyHTML] = [
        +record.timestamp, record.lastMessageType, record.participants,
        record.id, record.body
      ];

      let number = participants[0];
      let thread = Threads.get(id);
      let draft, draftId;
      let iconLabel = '';

      let isGroup = record.isGroup || false;

      if (!Startup.hasGroup) {
        isGroup = false;
      }

      // A new conversation "is" a draft
      let isDraft = typeof thread === 'undefined';

      // A an existing conversation "has" a draft
      // (or it doesn't, depending on the value
      // returned by thread.hasDrafts)
      let hasDrafts = isDraft ? false : thread.hasDrafts;

      if (hasDrafts) {
        draft = Drafts.byThreadId(thread.id).latest;
        timestamp = Math.max(draft.timestamp, timestamp);
        // If the draft is newer than the message, update
        // the body with the draft content's first string.
        if (draft.timestamp >= record.timestamp) {
          bodyHTML = draft.content.find(function(content) {
            if (typeof content === 'string') {
              return true;
            }
          });
          type = draft.type;
        }
      }

      if (isGroup) {
        type = 'group';
      }

      bodyHTML = Template.escape(bodyHTML || '');

      li.id = 'thread-' + id;
      li.dataset.threadId = id;
      li.dataset.time = timestamp;
      li.dataset.lastMessageType = type;
      li.classList.add('threadlist-item');
      li.classList.add('navigable');

      if (hasDrafts || isDraft) {
        // Set the "draft" visual indication
        li.classList.add('draft');

        if (hasDrafts) {
          li.classList.add('has-draft');
          iconLabel = 'has-draft';
        } else {
          li.classList.add('is-draft');
          iconLabel = 'is-draft';
        }

        draftId = hasDrafts ? draft.id : record.id;

        // Used in renderDrafts as an efficient mechanism
        // for checking whether a draft of a specific ID
        // has been rendered.
        this.draftRegistry[draftId] = true;
      }

      if (record.unreadCount > 0) {
        li.classList.add('unread');
        iconLabel = 'unread-thread';
      }

      // Render markup with thread data
      li.innerHTML = this.tmpl.thread.interpolate({
        hash: isDraft ? '#composer' : '#thread=' + id,
        mode: isDraft ? 'drafts' : 'threads',
        id: isDraft ? draftId : id,
        number: number,
        bodyHTML: bodyHTML,
        timestamp: String(timestamp),
        iconLabel: iconLabel
      }, {
        safe: ['id', 'bodyHTML']
      });

      TimeHeaders.update(li.querySelector('time'));

      if (draftId) {
        // Used in handleEvent to set the ThreadUI.draft object
        this.draftLinks.set(
          li.querySelector('a'), draftId
        );
      }

      return li;
    },

    deleteCurrentThread: function() {
      let messageIdsToDelete = [];
      let threadId = null;
      if (this.currentThread) {
        threadId = this.currentThread.dataset.threadId;
      }

      function onAllThreadMessagesRetrieved() {
        MessageManager.deleteMessages(messageIdsToDelete);
        ThreadListUI.deleteThread(threadId);
        messageIdsToDelete = null;
        ThreadListUI.currentThread = null;
        WaitingScreen.hide();
      }

      function onThreadMessageRetrieved(message) {
        messageIdsToDelete.push(message.id);
        return true;
      }

      function performDelete() {
        WaitingScreen.show();
        if (exports.option) {
          exports.option.hide();
        }
        let isDraft = typeof Threads.get(threadId) === 'undefined';
        if (isDraft) {
          Drafts.delete(Drafts.get(threadId));
          ThreadListUI.removeThread(threadId);
          Drafts.store();
          WaitingScreen.hide();
          ThreadListUI.currentThread = null;
        } else {
          MessageManager.getMessages({
            filter: { threadId: threadId },
            each: onThreadMessageRetrieved,
            end: onAllThreadMessagesRetrieved
          });
        }
      }

      function deleteCallback() {
        performDelete();
      }

      if (threadId) {
        Utils.confirmAlert('confirmation-title',
                           'delete-current-thread?',
                           'cancel', null, null, null,
                           'delete', deleteCallback);
      }
      Utils.menuOptionVisible = false;
    },

    deleteThread: function(threadId) {
      // Threads.delete will handle deleting
      // any Draft objects associated with the
      // specified threadId.
      Threads.delete(threadId);

      // Cleanup the DOM
      this.removeThread(threadId);

      // Remove notification if exist
      Utils.closeNotificationsForThread(threadId);
    },

    insertThreadContainer:
     function thlui_insertThreadContainer(group, timestamp) {
      // We look for placing the group in the right place.
      let headers = this.container.getElementsByTagName('header');
      let groupFound = false;
      for (let i = 0; i < headers.length; i++) {
        if (timestamp >= headers[i].dataset.time) {
          groupFound = true;
          this.container.insertBefore(group, headers[i].parentNode);
          break;
        }
      }
      if (!groupFound) {
        this.container.appendChild(group);
      }
    },

    updateThread: function thlui_updateThread(record, options) {
      if (!record) {
        return;
      }
      let thread = Thread.create(record, options);
      let threadUINode = document.getElementById('thread-' + thread.id);
      let threadUITime = threadUINode ? +threadUINode.dataset.time : NaN;
      let recordTime = +thread.timestamp;
      if (options && options.timestamp) {
        recordTime = options.timestamp;
      }
      // For legitimate in-memory thread objects, update the stored
      // Thread instance with the newest data. This check prevents
      // draft objects from inadvertently creating bogus thread
      // objects.
      if (Threads.has(thread.id)) {
        Threads.set(thread.id, thread);
      }

      // Edge case: if we just received a message that is older than the latest
      // one in the thread, we only need to update the 'unread' status.
      let newMessageReceived = options && options.unread;
      if (newMessageReceived && threadUITime > recordTime) {
        this.mark(thread.id, 'unread');
        MessageCache.clear('threads-container');
        this.saveCache();
        return;
      }

      // If we just deleted messages in a thread but kept the last message
      // unchanged, we don't need to update the thread UI.
      let messagesDeleted = options && options.deleted;
      if (messagesDeleted && threadUITime === recordTime) {
        return;
      }

      // General case: update the thread UI.
      if (threadUINode) {
        // remove the current thread node in order to place the new one properly
        this.removeThread(thread.id);
      }

      this.setEmpty(false);
      if (this.appendThread(thread)) {
        this.sticky && this.sticky.refresh();
      }

      // Delete cache when we save the new cache.
      MessageCache.clear('threads-container');
      // We do not need cache the no message page.
      if (this.noMessages.classList.contains('hide')) {
        this.saveCache();
      }
    },

    _canSwitchBetweenThreads: function() {
      return (Navigation.isCurrentPanel('thread') &&
              ((!Compose.isFocused() && !Compose.isSubjectFocused()) &&
               !window.option.menuVisible));
    },

    _switchPrevNextThread: function(shift) {
      if (!Compose.isEmpty() ||
          (!!ThreadUI.recipients && ThreadUI.recipients.length !== 0)) {
        ThreadUI.saveDraft({
          'preserve': true,
          'autoSave': true
        }, () => {
          ThreadListUI.switchThreadPage(shift);
        });
      } else {
        ThreadUI.discardDraft();
        ThreadListUI.switchThreadPage(shift);
      }
    },

    switchThreadPage: function(shift) {
      let currentId = Threads.currentId,
          threads = [];

      Threads.forEach( (v,k) => threads.push( k ) );
      this.isSwitchCase = true;
      let destId = threads[ (threads.indexOf( currentId ) + shift +
                             threads.length) % threads.length ];
      // We need backup the thread id to confirm there is not confuse
      // when more than 5 messages switch thread.
      ThreadUI.threadIdBackUp = destId;
      Navigation.toPanel('thread', { id: destId });
    },

    switchPreviousThread: function thlui_switchPreviousThread() {
      this._switchPrevNextThread(-privateMembers.get(this).threadSwitchId);
    },

    switchNextThread: function thlui_switchNextThread() {
      this._switchPrevNextThread(+privateMembers.get(this).threadSwitchId);
    },

    onMessageSending: function thlui_onMessageSending(e) {
      this.updateThread(e.message);
    },

    onMessageReceived: function thlui_onMessageReceived(e) {
      // If user currently in the same thread, then mark thread as read
      let markAsRead = Navigation.isCurrentPanel('thread', {
        id: e.message.threadId
      });

      this.updateThread(e.message, { unread: !markAsRead });
    },

    onThreadsDeleted: function thlui_onThreadDeleted(e) {
      e.ids.forEach(function(threadId) {
        if (Threads.has(threadId)) {
          this.deleteThread(threadId);
        }
      }, this);
      let count = e.ids.length;
      if (count) {
        Toaster.showToast({
          messageL10nId: 'deleted-threads',
          messageL10nArgs: {n: count},
          latency: 2000
        });
      }
    },

    /**
     * Append a thread to the global threads container. Creates a time container
     * (i.e. for a day or some other time period) for this thread if it doesn't
     * exist already.
     *
     * @return Boolean true if a time container was created, false otherwise
     */
    appendThread: function thlui_appendThread(thread) {
      if (navigator.mozL10n.readyState !== 'complete') {
        navigator.mozL10n.once(this.appendThread.bind(this, thread));
        return;
      }

      let timestamp = +thread.timestamp;
      let drafts = Drafts.byThreadId(thread.id);
      let firstThreadInContainer = false;

      if (drafts.length) {
        timestamp = Math.max(drafts.latest.timestamp, timestamp);
      }

      // We create the DOM element of the thread
      let node = this.createThread(thread);

      // Update info given a number
      this.setContact(node);

      // Is there any container already?
      let threadsContainerID = 'threadsContainer_' + Utils.getDayDate(timestamp);
      let threadsContainer = document.getElementById(threadsContainerID);
      // If there is no container we create & insert it to the DOM
      if (!threadsContainer) {
        // We create the wrapper with a 'header' & 'ul'
        let threadsContainerWrapper =
          this.createThreadContainer(timestamp);
        // Update threadsContainer with the new value
        threadsContainer = threadsContainerWrapper.childNodes[1];
        // Place our new content in the DOM
        this.insertThreadContainer(threadsContainerWrapper, timestamp);
        // We had to create a container, so this will be the first thread in it.
        firstThreadInContainer = true;
      }

      // Where have I to place the new thread?
      let threads = threadsContainer.getElementsByTagName('li');
      let threadFound = false;
      for (let i = 0, l = threads.length; i < l; i++) {
        if (timestamp > threads[i].dataset.time) {
          threadFound = true;
          threadsContainer.insertBefore(node, threads[i]);
          break;
        }
      }

      if (!threadFound) {
        threadsContainer.appendChild(node);
      }

      if (this.inEditMode) {
        // Remove the new added thread id from the selection handler
        this.selectionHandler.unselect(thread.id);

        this.checkInputs();
      }

      return firstThreadInContainer;
    },

    // Adds a new grouping header if necessary (today, tomorrow, ...)
    createThreadContainer: function thlui_createThreadContainer(timestamp) {
      let threadContainer = document.createElement('div');
      // Create Header DOM Element
      let headerDOM = document.createElement('header');

      // The id is used by the sticky header code as the -moz-element target.
      headerDOM.id = 'header_' + timestamp;
      headerDOM.className = 'h3';

      // Append 'time-update' state
      headerDOM.dataset.timeUpdate = 'repeat';
      headerDOM.dataset.time = timestamp;
      headerDOM.dataset.dateOnly = true;

      // Create UL DOM Element
      let threadsContainerDOM = document.createElement('ul');
      threadsContainerDOM.id = 'threadsContainer_' +
                               Utils.getDayDate(timestamp);
      // Add text
      headerDOM.innerHTML = Utils.getHeaderDate(timestamp);

      // Add to DOM all elements
      threadContainer.appendChild(headerDOM);
      threadContainer.appendChild(threadsContainerDOM);
      return threadContainer;
    },

    // Method for updating all contact info after creating a contact
    updateContactsInfo: function thlui_updateContactsInfo() {
      // Prevents cases where updateContactsInfo method is called
      // before ThreadListUI.container exists (as observed by errors
      // in the js console)
      if (!this.container) {
        return;
      }
      // Retrieve all 'li' elements
      let threads = this.container.getElementsByTagName('li');

      [].forEach.call(threads, this.setContact.bind(this));

      if (Navigation.isCurrentPanel('thread-list')) {
        this.updateSKs();
      }
    },

    mark: function thlui_mark(id, current) {
      let li = document.getElementById('thread-' + id);
      let remove = 'read';

      if (current === 'read') {
        remove = 'unread';
      }

      if (li) {
        li.classList.remove(remove);
        li.classList.add(current);
      }
    },

    onDraftSaved: function thlui_onDraftSaved() {
      Toaster.showToast({
        messageL10nId: 'message-draft-saved',
        latency: this.DRAFT_SAVED_DURATION
      });
    },
    onDraftDiscarded: function thlui_onDraftDiscarded() {
      Toaster.showToast({
        messageL10nId: 'draft-discard-content',
        latency: this.DRAFT_SAVED_DURATION
      });
    },

    whenReady: function() {
      return this.readyDeferred.promise;
    }
  };

  Object.defineProperty(ThreadListUI, 'allInputs', {
    get: function() {
      return this.getAllInputs();
    }
  });

  exports.ThreadListUI = ThreadListUI;
}(this));
