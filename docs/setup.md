## EToolbox Authoring Insider - Setup

Follow the _Insider_'s icon to the [Settings](http://localhost.hpe.com:4502/etoolbox/authoring-insider.html) page. You will see several tabs in the page.

![Image settings](image-settings.png)

### Dialog tools

The *Dialog tools* tab is the list of present tools. Each of the tools can be enabled or disabled with a checkbox. Those tools that are deactivated will not be displayed in tool dropdowns in AEM dialogs.

The tools can be dragged up and down. This will, naturally, change their order in a tool dropdown in an AEM dialog.

The tools can be deleted/cleaned up as well. Mind that a tool that is essentially a variation of a common templated (such as "Expand text") can be removed completely. But a tool which is unique for its own template (such as "Image caption") can only be "cleaned up." That is, the current settings of the tool are erased, but the "template" remains there and can only be disabled. Owing to this, a user always sees all the tools/templates that are technically available and is able to activate or deactivate them as they need.

Every tool can be modified by clicking the "Properties" button which opens a properties dialog. Usually the dialog allows altering the title and icon of the tool as well as its enabled status. For AI-powered tools, there is also the possibility to modify prompts and other parameters.

![Tool properties](image-tool-props.png)


##### Field selection

Many tools offer the way to control "Field selection," that is, to what dialog fields in what areas the tool will attach. This setting is a multifield. Every entry is a sort of "rule" that defines the "visibility" of a tool.

A "rule" can be simply a CSS-style selector. Else it can contain one or more key-value pairs optionally preceded by a scope flag and optionally followed by a selector.
```
! page properties field = "title" attribute ^= "data-title" .my-title

│ └────flag─────┘ └────────────key-value pairs────────────┘ └selector┘
│
└ sign of an inverted rule (optional)
```

A _flag_ is optional and case-insensitive. When present, it defined the "scope" of the tool. Use _dialog_ for tools that must only be visible insider component's dialogs. Use _properties_ or _page properties_ for tools that must only be visible in page properties.

A key-value pair must start with one of the keys enumerated below, followed by one of the equals/includes operators and a value. A value containing spaces must be enclosed in quotes.

We process the following keys:
- _field_ - the value of the `name` attribute of the dialog field. You don't need to precede it with `./`. Either "regular" text fields or RTE fields will be matched despite the latter having complex structure with the real "name" bearing element nested somewhere inside the structure.
- _attribute_ (alias _attr_) - an arbitrary attribute of the dialog field, taken by its name (not by value). This is useful for matching numerous fields that all share the same attribute. Using a tool like _EToolbox Authoring Kit_ you can automatically mark all the fields of interest with an attribute like "data-ai-mediated" and then set up all the tools uniformly to match only those fields.
- _container_ (aliases _parent_, _within_) - the CSS-style selector that would match an arbitrary DOM container in which the current field is located.
- _label_ - the label of the dialog field.
- _component_ - the name of the component for which this dialog is shown.
- _tab_ - the name of the tab in the dialog.
- _href_ (aliases _url_, _path_) - matches the address of the current page. Therefore, you can make some tools be available only in particular pages of your website.
- _selector_ - a CSS-style selector the current field must match. Note: a selector can just be put after all the key-values pairs without this "introductory" key. The "selector=" key only serves for better readability.

Between the key and the value in a key-value pair, the following operators can be used:
- _=_ - exact match;
- _^=_ - starts with;
- _$_ - ends with;
- _*= - contains (performs case-insensitive search).

If a rule entry starts with `!`, it is considered an inverted rule. That is, the tool will be attached to all fields except those that match the rule.
Note: while the non-inverted rules are grouped by the logical OR, the inverted rules are grouped by the logical AND. This means that if there are several inverted rules, all of them must be satisfied for the tool to be attached. E.g., the following group of rules:
1) field="title", 
2) field=description, 
3) field = keywords,
4) ! component *= "Anchor" 

-- will attach the tool to all fields with the name "title" or "description", or "keywords" except those in the dialogs of "Anchor", "New Anchor" or "Anchor Nav".

Here are some valid examples of "Field selection" rules:
```
.my-field                           // Simple CSS-style selectors.
[type="text"]:not(.my-field)

properties field="jcr:description"  // Will match only fields with the name "jcr:description" in page properties.

component *= "Anchor" field=title   // Will match a field with the name "title" or "./title" in a dialog .
                                    // of a component whose name contains "Anchor".
                                    
dialog href *= "/we-retail/"        // Will match all fields in dialogs of components located within pages
                                    // under the "/we-retail/" section of the site. But NOT in page properties.
```

If the "Field selection" multifield is left empty, the tool is attached to all available dialog fields.

##### Adding a new tool

Click the "Add" button to add another template-based tool (or "variation"). Select the template in the dialog that opens, and wait for the complete tool properties dialog to appear. After submitting the dialog, drag the newly created tool variation to a desired position in the list. 

### Providers

The *Providers* tab allows creating, modifying, and deleting/cleaning up providers. Working with this tab follows the same principle as described above.

Speaking about AI integrations, _Insider_ distinguishes templates for _external_ and _own_ providers. External providers are accessed via AEM instance and, therefore, allow extensive access control and/or keeping access tokens. A connection to ChatGPT can serve as an example. "Own" providers are to be accessed directly from the user's browser. They are usually used for testing purposes or for the cases when the user has access a private AI model.  

Most important is the possibility to reorder providers. Because a _tool_ can consume different providers, there must be a default ("first-choice") provider. This is the one that is situated in the lost above other providers for the same tool.

##### Adding a new provider

Click the "Add" button to add a new provider. Select the provider type in the dialog that opens, and wait for the complete provider properties dialog to appear. After submitting the dialog, drag the newly created provider to a desired position in the list.