## EToolbox Authoring Insider - Setup

Follow the _Insider_'s icon to the [Settings](http://localhost.hpe.com:4502/etoolbox/authoring-insider.html) page. You will see several tabs in the page.

![Image settings](image-settings.png)

The **Dialog tools* tab is the list of present tools. Each of the tools can be enabled or disabled with a checkbox. Those tools that are deactivated will not be displayed in tool dropdowns in AEM dialogs.

The tools can be dragged up and down. This will, naturally, change their order in a tool dropdown in an AEM dialog.

The tools can be deleted/cleaned up as well. Mind that a tool that is essentially a variation of a common templated (such as "Expand text") can be removed completely. But a tool which is unique for its own template (such as "Image caption") can only be "cleaned up." That is, the current settings of the tool are erased, but the "template" remains there and can only be disabled. Owing to this, a user always sees all the tools/templates that are technically available and is able to activate or deactivate them as they need.

Every tool can be modified by clicking the "Properties" button which opens a properties dialog. Usually the dialog allows altering the title and icon of the tool as well as its enabled status. For AI-powered tools, there is also the possibility to modify prompts and other parameters.

![Tool properties](image-tool-props.png)

Many tools offer the way to control "Field selection," that is, to what dialog fields in what areas the tool will attach. The field selection is a multifield to which you can pass entries such as CSS selectors for the needed fields. If the field selection is left empty, the tool is attached to all available dialog fields.

Click the "Add" button to add another template-based tool (or "variation). Select the template in the dialog that opens, and wait for the complete tool properties dialog to appear. After submitting the dialog, drag the newly created tool variation to a desired position in the list. 

The **Providers** tab allows creating, modifying, and deleting/cleaning up providers. Working with this tab follows the same principle as described above.

Speaking about AI integrations, _Insider_ distinguishes templates for _external_ and _own_ providers. External providers are accessed via AEM instance and, therefore, allow extensive access control and/or keeping access tokens. A connection to ChatGPT can serve as an example. "Own" providers are to be accessed directly from the user's browser. They are usually used for testing purposes or for the cases when the user has access a private AI model.  

Most important is the possibility to reorder providers. Because a _tool_ can consume different providers, there must be a default ("first-choice") provider. This is the one that is situated in the lost above other providers for the same tool.